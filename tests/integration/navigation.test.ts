import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { saveContext, saveDraft, readDraft } from "../../lib/server/navigation";
import { subjectProgress } from "../../lib/server/progress-query";

afterAll(async () => {
  await pool.end();
});
it("selects a locked shell without changing last learning activity or enabling a draft mutation", async () => {
  const id = randomUUID();
  const subject = { id, kind: "guest" as const };
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  const context = {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-2",
  };
  await saveContext(subject, { ...context, kind: "selection" });
  expect((await subjectProgress(subject)).lastActivity).toBeNull();
  await expect(
    saveContext(subject, { ...context, kind: "interaction" }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    saveDraft(subject, { ...context, version: 1, input: "forged" }),
  ).rejects.toMatchObject({ status: 403 });
  await saveContext(subject, {
    ...context,
    stageId: "de-01-0",
    kind: "interaction",
  });
  expect((await subjectProgress(subject)).lastActivity?.stage_id).toBe(
    "de-01-0",
  );
});
it("isolates drafts by principal, rejects stale versions and keeps existing server data", async () => {
  const ids = [randomUUID(), randomUUID()];
  for (const id of ids) {
    await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
    await pool.query(
      "INSERT INTO lesson_progress(subject_id,lesson_id,video_credited) VALUES($1,'de-01',true)",
      [id],
    );
  }
  const subject = { id: ids[0], kind: "guest" as const };
  const other = { id: ids[1], kind: "guest" as const };
  const input = {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    version: 2,
    input: { selections: [] },
  };
  await saveDraft(subject, input);
  await expect(
    saveDraft(subject, { ...input, version: 1, input: "stale" }),
  ).rejects.toMatchObject({ status: 409 });
  expect(
    (await readDraft(subject, input.lessonId, input.revisionId, input.stageId))
      ?.input,
  ).toEqual(input.input);
  expect(
    await readDraft(other, input.lessonId, input.revisionId, input.stageId),
  ).toBeNull();
});
