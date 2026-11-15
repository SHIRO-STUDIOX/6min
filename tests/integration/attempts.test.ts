import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { submitAttempt } from "../../lib/server/attempts";
import type { Subject } from "../../lib/server/identity";

afterAll(async () => {
  await pool.end();
});
async function guest(video = true): Promise<Subject> {
  const id = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  if (video)
    await pool.query(
      "INSERT INTO lesson_progress(subject_id,lesson_id,video_credited,unlocked_at) VALUES($1,'de-01',true,now())",
      [id],
    );
  return { id, kind: "guest" };
}
function attempt() {
  return {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    kind: "full",
    completed: true,
    answers: [
      {
        questionId: "de-01-1-q0",
        revision: 1,
        response: { choiceId: "option-0" },
      },
      {
        questionId: "de-01-1-q1",
        revision: 1,
        response: { choiceId: "option-0" },
      },
    ],
  };
}

it("server grades and atomically persists a full attempt, ignoring no client authority", async () => {
  const subject = await guest();
  const result = await submitAttempt(subject, attempt(), randomUUID());
  expect(result.exerciseScore).toBe(0.5);
  expect(
    (
      await pool.query(
        "SELECT correct FROM question_results WHERE attempt_id=$1 ORDER BY question_id",
        [result.attemptId],
      )
    ).rows,
  ).toEqual([{ correct: true }, { correct: false }]);
  expect(
    (
      await pool.query(
        "SELECT score::float FROM learning_attempts WHERE id=$1",
        [result.attemptId],
      )
    ).rows[0].score,
  ).toBe(0.5);
});
it("serializes concurrent retries with the same key and returns the same outcome", async () => {
  const subject = await guest();
  const key = randomUUID();
  const results = await Promise.all([
    submitAttempt(subject, attempt(), key),
    submitAttempt(subject, attempt(), key),
  ]);
  expect(results[0]).toEqual(results[1]);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1 AND idempotency_key=$2",
        [subject.id, key],
      )
    ).rows[0].count,
  ).toBe(1);
  await expect(
    submitAttempt(
      subject,
      {
        ...attempt(),
        answers: attempt().answers.map((answer) => ({
          ...answer,
          response: { choiceId: "option-1" },
        })),
      },
      key,
    ),
  ).rejects.toMatchObject({ status: 409 });
});
it("rejects stale, partial, forged and duplicate-question submissions without records", async () => {
  const subject = await guest();
  for (const input of [
    { ...attempt(), revisionId: "old" },
    {
      ...attempt(),
      answers: attempt().answers.map((answer) => ({ ...answer, revision: 99 })),
    },
  ]) {
    await expect(
      submitAttempt(subject, input, randomUUID()),
    ).rejects.toMatchObject({ status: 409 });
  }
  for (const input of [
    { ...attempt(), score: 1 },
    { ...attempt(), completed: false },
    { ...attempt(), answers: [attempt().answers[0]] },
    { ...attempt(), answers: [attempt().answers[0], attempt().answers[0]] },
  ]) {
    await expect(
      submitAttempt(subject, input, randomUUID()),
    ).rejects.toMatchObject({ status: 422 });
  }
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1",
        [subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
});
it("does not allow missing video, locked successor, stage skipping or fabricated identity", async () => {
  await expect(
    submitAttempt(await guest(false), attempt(), randomUUID()),
  ).rejects.toMatchObject({ code: "VIDEO_REQUIRED" });
  const subject = await guest();
  await expect(
    submitAttempt(subject, { ...attempt(), stageId: "de-01-2" }, randomUUID()),
  ).rejects.toMatchObject({ code: "STAGE_PREREQUISITE_REQUIRED" });
  await expect(
    submitAttempt(
      subject,
      { ...attempt(), lessonId: "de-02", revisionId: "de-02-v1" },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "PREREQUISITE_REQUIRED" });
  await expect(
    submitAttempt({ id: randomUUID(), kind: "guest" }, attempt(), randomUUID()),
  ).rejects.toMatchObject({ status: 401 });
});
