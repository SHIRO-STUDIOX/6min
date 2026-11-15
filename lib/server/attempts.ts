import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { assertCommercialAccess } from "./access";
import { recordMistake, recomputeProgress } from "./progression";
import { ContentError } from "./content";
import type { Subject } from "./identity";
import { attemptSchema } from "../contracts/attempt";
import { demoContentAllowed } from "../contracts/content";
import { gradeAnswer } from "../domain/learning/grading";
import { fullAttemptFraction } from "../domain/learning/attempt-score";

export type AttemptOutcome = {
  attemptId: string;
  exerciseScore: number;
  gradedResults: { questionId: string; revision: number; correct: boolean }[];
  lessonScore?: number;
  currentLessonScore?: number;
  unlockEvent?: { lessonId: string } | null;
};
export async function submitAttempt(
  subject: Subject,
  input: unknown,
  key: string,
): Promise<AttemptOutcome> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success || !/^[\w-]{8,120}$/.test(key))
    throw new ContentError("INVALID_ATTEMPT", 422);
  const body = parsed.data;
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${subject.id},0))`,
    );
    const identity = await tx.execute(
      sql`SELECT kind FROM subjects WHERE id=${subject.id}`,
    );
    if (identity.rows[0]?.kind !== subject.kind)
      throw new ContentError("IDENTITY_REQUIRED", 401);
    const previous = await tx.execute(
      sql`SELECT id,score,request_hash FROM learning_attempts WHERE subject_id=${subject.id} AND idempotency_key=${key}`,
    );
    if (previous.rows[0]) {
      const saved = previous.rows[0];
      if (saved.request_hash !== hash)
        throw new ContentError("IDEMPOTENCY_CONFLICT", 409);
      const receipt = await tx.execute(
        sql`SELECT outcome FROM attempt_receipts WHERE attempt_id=${saved.id as string}`,
      );
      if (receipt.rows[0]) return receipt.rows[0].outcome as AttemptOutcome;
      const results = await tx.execute(
        sql`SELECT question_id AS "questionId",question_revision AS revision,correct FROM question_results WHERE attempt_id=${saved.id as string} ORDER BY question_id`,
      );
      return {
        attemptId: saved.id as string,
        exerciseScore: Number(saved.score),
        gradedResults: results.rows as AttemptOutcome["gradedResults"],
      };
    }
    const rows = await tx.execute(
      sql`SELECT l.sequence_number,l.published,l.current_revision_id,r.demo_only FROM lessons l JOIN lesson_revisions r ON r.id=l.current_revision_id WHERE l.id=${body.lessonId}`,
    );
    const lesson = rows.rows[0];
    if (!lesson?.published || (lesson.demo_only && !demoContentAllowed()))
      throw new ContentError("CONTENT_UNAVAILABLE", 404);
    if (lesson.current_revision_id !== body.revisionId)
      throw new ContentError("STALE_CONTENT", 409);
    await assertCommercialAccess(tx, subject, Number(lesson.sequence_number));
    const progress = await tx.execute(
      sql`SELECT video_credited,unlocked_at FROM lesson_progress WHERE subject_id=${subject.id} AND lesson_id=${body.lessonId}`,
    );
    if (lesson.sequence_number !== 1 && !progress.rows[0]?.unlocked_at)
      throw new ContentError("PREREQUISITE_REQUIRED", 403);
    const stages = await tx.execute(
      sql`SELECT id,kind,exercise_type,stage_order FROM stages WHERE revision_id=${body.revisionId} ORDER BY stage_order`,
    );
    const stage = stages.rows.find(
      (item) => item.id === body.stageId && item.kind === "exercise",
    );
    if (!stage) throw new ContentError("INVALID_STAGE", 422);
    if (!progress.rows[0]?.video_credited)
      throw new ContentError("VIDEO_REQUIRED", 403);
    for (const prior of stages.rows.filter(
      (item) =>
        item.kind === "exercise" &&
        Number(item.stage_order) < Number(stage.stage_order),
    )) {
      const attempts = await tx.execute(
        sql`SELECT 1 FROM learning_attempts WHERE subject_id=${subject.id} AND stage_id=${prior.id as string} AND kind='full' LIMIT 1`,
      );
      if (!attempts.rows.length)
        throw new ContentError("STAGE_PREREQUISITE_REQUIRED", 403);
    }
    if (
      !["vocabulary-match", "grammar-order", "dictation"].includes(
        stage.exercise_type as string,
      )
    )
      throw new ContentError("GRADING_UNAVAILABLE", 503);
    const questions = await tx.execute(
      sql`SELECT id,revision,answer_key,grading_kind FROM questions WHERE stage_id=${body.stageId} AND active ORDER BY id`,
    );
    if (
      new Set(body.answers.map((answer) => answer.questionId)).size !==
        body.answers.length ||
      (body.kind === "full" && body.answers.length !== questions.rows.length)
    )
      throw new ContentError("FULL_ATTEMPT_REQUIRED", 422);
    const selected = questions.rows.filter((question) =>
      body.answers.some((answer) => answer.questionId === question.id),
    );
    if (selected.length !== body.answers.length)
      throw new ContentError("INVALID_QUESTION", 422);
    for (const question of selected) {
      if (
        body.answers.find((answer) => answer.questionId === question.id)!
          .revision !== question.revision
      )
        throw new ContentError("STALE_CONTENT", 409);
    }
    if (body.kind === "review") {
      const baseline = await tx.execute(
        sql`SELECT 1 FROM learning_attempts WHERE subject_id=${subject.id} AND stage_id=${body.stageId} AND kind='full' LIMIT 1`,
      );
      if (!baseline.rows.length)
        throw new ContentError("REVIEW_REQUIRES_FULL_ATTEMPT", 422);
      for (const answer of body.answers) {
        const state = await tx.execute(
          sql`SELECT status FROM mistake_current WHERE subject_id=${subject.id} AND question_id=${answer.questionId} AND question_revision=${answer.revision}`,
        );
        if (state.rows[0]?.status !== "needsReview")
          throw new ContentError("QUESTION_NOT_REVIEWABLE", 422);
      }
    }
    const results = selected.map((question) => {
      const answer = body.answers.find(
        (item) => item.questionId === question.id,
      )!;
      if (answer.revision !== question.revision)
        throw new ContentError("STALE_CONTENT", 409);
      return {
        questionId: answer.questionId,
        revision: answer.revision,
        response: answer.response,
        correct: gradeAnswer(
          question.grading_kind as string,
          answer.response,
          question.answer_key,
        ),
      };
    });
    const score = fullAttemptFraction(
      results.filter((result) => result.correct).length,
      results.length,
    );
    const attemptId = randomUUID();
    await tx.execute(
      sql`INSERT INTO learning_attempts(id,subject_id,revision_id,stage_id,kind,completed,idempotency_key,request_hash,score,completed_at) VALUES (${attemptId},${subject.id},${body.revisionId},${body.stageId},${body.kind},true,${key},${hash},${score},clock_timestamp())`,
    );
    for (const result of results) {
      await tx.execute(
        sql`INSERT INTO question_results(attempt_id,question_id,question_revision,correct,answer_payload) VALUES (${attemptId},${result.questionId},${result.revision},${result.correct},${JSON.stringify(result.response)}::jsonb)`,
      );
      await recordMistake(
        tx,
        subject.id,
        attemptId,
        result.questionId,
        result.revision,
        result.correct,
      );
    }
    const progression = await recomputeProgress(tx, subject.id, body.lessonId);
    await tx.execute(sql`INSERT INTO last_activity(subject_id,lesson_id,stage_id,source_route) VALUES (${subject.id},${body.lessonId},${body.stageId},${"/classroom/" + encodeURIComponent(body.lessonId)})
      ON CONFLICT(subject_id) DO UPDATE SET lesson_id=excluded.lesson_id,stage_id=excluded.stage_id,source_route=excluded.source_route,updated_at=now()`);
    const outcome: AttemptOutcome = {
      ...progression,
      attemptId,
      exerciseScore: score,
      gradedResults: results.map(
        ({ response: _response, ...result }) => result,
      ),
    };
    await tx.execute(
      sql`INSERT INTO attempt_receipts(attempt_id,outcome) VALUES (${attemptId},${JSON.stringify(outcome)}::jsonb)`,
    );
    return outcome;
  });
}
