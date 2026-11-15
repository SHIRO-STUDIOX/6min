import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { lessonPublic } from "../../lib/server/content";
import { subjectProgress } from "../../lib/server/progress-query";
import { commercialAllowed } from "../../lib/server/access";
import { submitAttempt } from "../../lib/server/attempts";

afterAll(async () => {
  await pool.end();
});
it("AU-01/02 serves own unlocked free lessons, highest unlocked current, and no paid grant", async () => {
  const id = randomUUID();
  const subject = { id, kind: "guest" as const };
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  for (const number of [2, 3, 4])
    await pool.query(
      "INSERT INTO lesson_progress(subject_id,lesson_id,unlocked_at) VALUES($1,$2,now())",
      [id, `de-0${number}`],
    );
  await pool.query(
    "INSERT INTO last_activity(subject_id,lesson_id,stage_id) VALUES($1,'de-01','de-01-0')",
    [id],
  );
  expect((await lessonPublic("de-02", subject)).id).toBe("de-02");
  expect((await lessonPublic("de-03", subject)).id).toBe("de-03");
  const progress = await subjectProgress(subject);
  expect(progress.currentLesson).toBe("de-04");
  expect(progress.lastActivity?.lesson_id).toBe("de-01");
  expect(
    progress.lessons.find((lesson) => lesson.id === "de-04")?.access.canStart,
  ).toBe(false);
  expect(await commercialAllowed(subject, 4)).toBe(false);
  // Forged UI flags are not accepted by the strict API schema.
  await expect(
    submitAttempt(
      subject,
      { lessonId: "de-04", isPaid: true, unlocked: true },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 422 });
  // Another identity cannot read this subject's progress by passing its public ID in a request body.
  const otherId = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [
    otherId,
  ]);
  await expect(
    lessonPublic("de-02", { id: otherId, kind: "guest" }),
  ).rejects.toMatchObject({ code: "PREREQUISITE_REQUIRED" });
});
