import { afterAll, expect, it } from "vitest";
import { catalog, lessonPublic } from "../../lib/server/content";
import { pool } from "../../lib/server/db";

afterAll(async () => {
  await pool.end();
});
it("exposes exactly 60 stable slots and only 3 published fixtures", async () => {
  const lessons = await catalog();
  expect(lessons).toHaveLength(60);
  expect(lessons.filter((lesson) => lesson.published)).toHaveLength(3);
  expect(
    lessons
      .filter((lesson) => lesson.access.canStart)
      .map((lesson) => lesson.id),
  ).toEqual(["de-01"]);
});
it("projects ordered public stages with no private keys", async () => {
  const lesson = await lessonPublic("de-01");
  expect(lesson.stages.map((stage) => stage.order)).toEqual([0, 1, 2]);
  expect(lesson.stages[1].questions).toHaveLength(2);
  const serialized = JSON.stringify(lesson);
  for (const key of [
    "answer_key",
    "answerKey",
    "choiceId",
    "tokenIds",
    "password_hash",
  ])
    expect(serialized).not.toContain(key);
});
it("fails closed for unpublished and successor content before subject-aware progression", async () => {
  await expect(lessonPublic("de-04")).rejects.toMatchObject({ status: 404 });
  await expect(lessonPublic("de-02")).rejects.toMatchObject({ status: 403 });
});
it("protects published question and revision history from edits", async () => {
  await expect(
    pool.query("UPDATE questions SET answer_key='{}' WHERE id='de-01-1-q0'"),
  ).rejects.toThrow("immutable");
  await expect(
    pool.query(
      "UPDATE lesson_revisions SET video_weight=99 WHERE id='de-01-v1'",
    ),
  ).rejects.toThrow("immutable");
});
