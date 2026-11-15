import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { ContentError } from "./content";
import {
  compare,
  decimal,
  effectiveExercise,
  fraction,
  lessonScore,
  maximum,
  numeric,
  type Fraction,
} from "../domain/learning/scoring";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function recordMistake(
  tx: Transaction,
  subjectId: string,
  attemptId: string,
  questionId: string,
  revision: number,
  correct: boolean,
) {
  const state = await tx.execute(
    sql`SELECT status FROM mistake_current WHERE subject_id=${subjectId} AND question_id=${questionId} AND question_revision=${revision}`,
  );
  if (correct && state.rows[0]?.status !== "needsReview") return;
  const kind = correct
    ? "corrected"
    : state.rows[0]?.status === "corrected"
      ? "reopened"
      : "incorrect";
  await tx.execute(
    sql`INSERT INTO mistake_events(id,subject_id,question_id,question_revision,attempt_id,kind,event_at) VALUES (${randomUUID()},${subjectId},${questionId},${revision},${attemptId},${kind},clock_timestamp())`,
  );
  if (correct) {
    await tx.execute(
      sql`UPDATE mistake_current SET status='corrected',latest_valid_answer_at=clock_timestamp() WHERE subject_id=${subjectId} AND question_id=${questionId} AND question_revision=${revision}`,
    );
  } else {
    await tx.execute(sql`INSERT INTO mistake_current(subject_id,question_id,question_revision,status,latest_wrong_at) VALUES (${subjectId},${questionId},${revision},'needsReview',clock_timestamp())
      ON CONFLICT(subject_id,question_id,question_revision) DO UPDATE SET status='needsReview',latest_wrong_at=clock_timestamp()`);
  }
}

export async function recomputeProgress(
  tx: Transaction,
  subjectId: string,
  lessonId: string,
) {
  const policy = await tx.execute(
    sql`SELECT l.course_id,l.sequence_number,r.id,r.video_weight,r.unlock_threshold FROM lessons l JOIN lesson_revisions r ON r.id=l.current_revision_id WHERE l.id=${lessonId}`,
  );
  const lesson = policy.rows[0];
  if (
    !lesson ||
    lesson.video_weight === null ||
    lesson.unlock_threshold === null
  )
    throw new ContentError("SCORING_POLICY_REQUIRED", 503);
  const priorRows = await tx.execute(
    sql`SELECT * FROM lesson_progress WHERE subject_id=${subjectId} AND lesson_id=${lessonId} FOR UPDATE`,
  );
  const prior = priorRows.rows[0];
  if (prior?.current_revision && prior.current_revision !== lesson.id)
    throw new ContentError("PROGRESS_REVISION_CONFLICT", 409);
  const stages = await tx.execute(
    sql`SELECT id FROM stages WHERE revision_id=${lesson.id as string} AND kind='exercise' ORDER BY stage_order`,
  );
  const currentFractions: Fraction[] = [];
  const earnedFractions: Fraction[] = [];
  let hasFull = false;
  for (const stage of stages.rows) {
    const attempts = await tx.execute(
      sql`SELECT id,completed_at FROM learning_attempts WHERE subject_id=${subjectId} AND stage_id=${stage.id as string} AND kind='full' ORDER BY score DESC,completed_at,id LIMIT 1`,
    );
    const best = attempts.rows[0];
    let current = fraction(0);
    if (best) {
      hasFull = true;
      const questions = await tx.execute(
        sql`SELECT question_id,question_revision,correct FROM question_results WHERE attempt_id=${best.id as string}`,
      );
      const corrections =
        await tx.execute(sql`SELECT e.question_id,e.question_revision FROM mistake_events e JOIN questions q ON q.id=e.question_id AND q.revision=e.question_revision
        WHERE e.subject_id=${subjectId} AND q.stage_id=${stage.id as string} AND e.kind='corrected' AND e.event_at>(SELECT completed_at FROM learning_attempts WHERE id=${best.id as string})`);
      const key = (row: Record<string, unknown>) =>
        `${row.question_id}@${row.question_revision}`;
      current = effectiveExercise(
        questions.rows.map(key),
        questions.rows.filter((row) => row.correct).map(key),
        corrections.rows.map(key),
      );
    }
    const earnedRows = await tx.execute(
      sql`SELECT earned_n,earned_d FROM exercise_progress WHERE subject_id=${subjectId} AND stage_id=${stage.id as string}`,
    );
    const stored = earnedRows.rows[0];
    const earned = maximum(
      stored
        ? fraction(stored.earned_n as string, stored.earned_d as string)
        : fraction(0),
      current,
    );
    const lastRows = await tx.execute(
      sql`SELECT id FROM learning_attempts WHERE subject_id=${subjectId} AND stage_id=${stage.id as string} AND kind='full' ORDER BY completed_at DESC,id DESC LIMIT 1`,
    );
    await tx.execute(sql`INSERT INTO exercise_progress(subject_id,stage_id,best_attempt_id,last_attempt_id,earned_fraction,earned_n,earned_d)
      VALUES (${subjectId},${stage.id as string},${(best?.id as string) ?? null},${(lastRows.rows[0]?.id as string) ?? null},${numeric(earned)},${earned.n.toString()},${earned.d.toString()})
      ON CONFLICT(subject_id,stage_id) DO UPDATE SET best_attempt_id=excluded.best_attempt_id,last_attempt_id=excluded.last_attempt_id,earned_fraction=excluded.earned_fraction,earned_n=excluded.earned_n,earned_d=excluded.earned_d`);
    currentFractions.push(current);
    earnedFractions.push(earned);
  }
  const videoWeight = decimal(String(lesson.video_weight));
  const current = lessonScore(
    videoWeight,
    Boolean(prior?.video_credited),
    currentFractions,
  );
  const earned = maximum(
    prior
      ? fraction(prior.earned_n as string, prior.earned_d as string)
      : fraction(0),
    lessonScore(videoWeight, Boolean(prior?.video_credited), earnedFractions),
  );
  const reached =
    Boolean(prior?.video_credited) &&
    hasFull &&
    compare(earned, decimal(String(lesson.unlock_threshold))) >= 0;
  await tx.execute(sql`INSERT INTO lesson_progress(subject_id,lesson_id,effective_score,current_score,current_revision,earned_n,earned_d,threshold_reached_at,last_activity_at)
    VALUES (${subjectId},${lessonId},${numeric(earned)},${numeric(current)},${lesson.id as string},${earned.n.toString()},${earned.d.toString()},CASE WHEN ${reached} THEN now() ELSE NULL END,now())
    ON CONFLICT(subject_id,lesson_id) DO UPDATE SET effective_score=excluded.effective_score,current_score=excluded.current_score,current_revision=excluded.current_revision,earned_n=excluded.earned_n,earned_d=excluded.earned_d,
      threshold_reached_at=COALESCE(lesson_progress.threshold_reached_at,excluded.threshold_reached_at),last_activity_at=now()`);
  let unlockEvent: { lessonId: string } | null = null;
  if (reached) {
    const next = await tx.execute(
      sql`SELECT id FROM lessons WHERE course_id=${lesson.course_id as string} AND sequence_number=${Number(lesson.sequence_number) + 1}`,
    );
    if (next.rows[0]) {
      const nextId = next.rows[0].id as string;
      const granted =
        await tx.execute(sql`INSERT INTO lesson_progress(subject_id,lesson_id,unlocked_at) VALUES (${subjectId},${nextId},now())
        ON CONFLICT(subject_id,lesson_id) DO UPDATE SET unlocked_at=now() WHERE lesson_progress.unlocked_at IS NULL RETURNING lesson_id`);
      if (granted.rows.length) unlockEvent = { lessonId: nextId };
    }
  }
  return {
    lessonScore: numeric(earned),
    currentLessonScore: numeric(current),
    unlockEvent,
  };
}
