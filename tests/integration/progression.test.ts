import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { submitAttempt } from "../../lib/server/attempts";
import { mistakes, reviewQuestions } from "../../lib/server/mistakes";

afterAll(async () => {
  await pool.end();
});
async function owner() {
  const id = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  await pool.query(
    "INSERT INTO lesson_progress(subject_id,lesson_id,video_credited,current_revision,unlocked_at) VALUES($1,'de-01',true,'de-01-v1',now())",
    [id],
  );
  return { id, kind: "guest" as const };
}
function match(choices: string[], kind = "full") {
  return {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    kind,
    completed: true,
    answers: choices.map((choiceId, index) => ({
      questionId: `de-01-1-q${index}`,
      revision: 1,
      response: { choiceId },
    })),
  };
}
function review(index: number, choiceId: string) {
  return {
    ...match([], "review"),
    answers: [
      { questionId: `de-01-1-q${index}`, revision: 1, response: { choiceId } },
    ],
  };
}
const grammar = {
  lessonId: "de-01",
  revisionId: "de-01-v1",
  stageId: "de-01-2",
  kind: "full",
  completed: true,
  answers: [
    {
      questionId: "de-01-2-q0",
      revision: 1,
      response: { tokenIds: ["token-0", "token-1"] },
    },
    {
      questionId: "de-01-2-q1",
      revision: 1,
      response: { tokenIds: ["token-0", "token-1"] },
    },
  ],
};

it("best full + later review grants once, reopens mistakes, preserves earned/unlock across baseline changes", async () => {
  const subject = await owner();
  const first = await submitAttempt(
    subject,
    match(["wrong", "wrong"]),
    randomUUID(),
  );
  expect(first.lessonScore).toBe(20);
  const list = await mistakes(subject);
  expect(list.items.map((item) => item.questionId)).toEqual([
    "de-01-1-q1",
    "de-01-1-q0",
  ]);
  expect(
    (await submitAttempt(subject, grammar, randomUUID())).lessonScore,
  ).toBe(60);
  const key = randomUUID();
  const corrected = await submitAttempt(subject, review(0, "option-0"), key);
  expect(corrected.lessonScore).toBe(80);
  expect(corrected.unlockEvent).toEqual({ lessonId: "de-02" });
  expect(await submitAttempt(subject, review(0, "option-0"), key)).toEqual(
    corrected,
  );
  await expect(
    submitAttempt(subject, review(0, "option-0"), randomUUID()),
  ).rejects.toMatchObject({ code: "QUESTION_NOT_REVIEWABLE" });
  expect(
    (await submitAttempt(subject, review(1, "option-1"), randomUUID()))
      .lessonScore,
  ).toBe(100);
  const weaker = await submitAttempt(
    subject,
    match(["wrong", "wrong"]),
    randomUUID(),
  );
  expect(weaker.lessonScore).toBe(100);
  expect(weaker.unlockEvent).toBeNull();
  const events = await pool.query(
    "SELECT kind FROM mistake_events WHERE subject_id=$1 AND question_id='de-01-1-q0' ORDER BY event_at",
    [subject.id],
  );
  expect(events.rows.map((row) => row.kind)).toEqual([
    "incorrect",
    "corrected",
    "reopened",
  ]);
  const better = await submitAttempt(
    subject,
    match(["wrong", "option-1"]),
    randomUUID(),
  );
  expect(better.currentLessonScore).toBe(80);
  expect(better.lessonScore).toBe(100);
  const projection = await pool.query(
    "SELECT best_attempt_id,last_attempt_id FROM exercise_progress WHERE subject_id=$1 AND stage_id='de-01-1'",
    [subject.id],
  );
  expect(projection.rows[0]).toEqual({
    best_attempt_id: better.attemptId,
    last_attempt_id: better.attemptId,
  });
  expect(
    (
      await pool.query(
        "SELECT unlocked_at IS NOT NULL AS unlocked FROM lesson_progress WHERE subject_id=$1 AND lesson_id='de-02'",
        [subject.id],
      )
    ).rows[0].unlocked,
  ).toBe(true);
  const currentReview = await reviewQuestions(subject, {
    questionRefs: [{ id: "de-01-1-q0", revision: 1 }],
  });
  expect(currentReview.items).toHaveLength(1);
  expect(JSON.stringify(currentReview)).not.toMatch(
    /answer_key|answerKey|choiceId/,
  );
  const other = await owner();
  expect((await mistakes(other)).items).toEqual([]);
  await expect(
    reviewQuestions(other, {
      questionRefs: [{ id: "de-01-1-q0", revision: 1 }],
    }),
  ).rejects.toMatchObject({ status: 422 });
});
it("does not let review create a full baseline or cross a content revision", async () => {
  const subject = await owner();
  await expect(
    submitAttempt(subject, review(0, "option-0"), randomUUID()),
  ).rejects.toMatchObject({ code: "REVIEW_REQUIRES_FULL_ATTEMPT" });
  await submitAttempt(subject, match(["wrong", "wrong"]), randomUUID());
  const stale = review(0, "option-0");
  stale.answers[0].revision = 2;
  await expect(
    submitAttempt(subject, stale, randomUUID()),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1 AND kind='review'",
        [subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
});
it("rolls back attempts, results and mistake events if the progression transaction fails late", async () => {
  const subject = await owner();
  await pool.query(
    "UPDATE lesson_progress SET current_revision='de-02-v1' WHERE subject_id=$1 AND lesson_id='de-01'",
    [subject.id],
  );
  await expect(
    submitAttempt(subject, match(["wrong", "wrong"]), randomUUID()),
  ).rejects.toMatchObject({ code: "PROGRESS_REVISION_CONFLICT" });
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1",
        [subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM mistake_events WHERE subject_id=$1",
        [subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
});
