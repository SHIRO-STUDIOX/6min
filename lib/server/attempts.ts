import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { ContentError } from "./content";
import type { Subject } from "./identity";
import { attemptSchema } from "../contracts/attempt";
import { demoContentAllowed } from "../contracts/content";
import { gradeAnswer } from "../domain/learning/grading";
import { fullAttemptFraction } from "../domain/learning/attempt-score";

export async function submitAttempt(
  subject: Subject,
  input: unknown,
  key: string,
) {
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
      const results = await tx.execute(
        sql`SELECT question_id AS "questionId",question_revision AS revision,correct FROM question_results WHERE attempt_id=${saved.id as string} ORDER BY question_id`,
      );
      return {
        attemptId: saved.id,
        exerciseScore: Number(saved.score),
        gradedResults: results.rows,
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
    if (Number(lesson.sequence_number) > 3)
      throw new ContentError("ENTITLEMENT_REQUIRED", 403);
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
      body.answers.length !== questions.rows.length ||
      new Set(body.answers.map((answer) => answer.questionId)).size !==
        body.answers.length
    )
      throw new ContentError("FULL_ATTEMPT_REQUIRED", 422);
    const results = questions.rows.map((question) => {
      const answer = body.answers.find(
        (item) => item.questionId === question.id,
      );
      if (!answer) throw new ContentError("FULL_ATTEMPT_REQUIRED", 422);
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
      sql`INSERT INTO learning_attempts(id,subject_id,revision_id,stage_id,kind,completed,idempotency_key,request_hash,score) VALUES (${attemptId},${subject.id},${body.revisionId},${body.stageId},'full',true,${key},${hash},${score})`,
    );
    for (const result of results)
      await tx.execute(
        sql`INSERT INTO question_results(attempt_id,question_id,question_revision,correct,answer_payload) VALUES (${attemptId},${result.questionId},${result.revision},${result.correct},${JSON.stringify(result.response)}::jsonb)`,
      );
    return {
      attemptId,
      exerciseScore: score,
      gradedResults: results.map(
        ({ response: _response, ...result }) => result,
      ),
    };
  });
}
