import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { ContentError, lessonPublic } from "./content";
import type { Subject } from "./identity";

const contextSchema = z
  .object({
    lessonId: z.string().max(120),
    revisionId: z.string().max(120),
    stageId: z.string().max(120),
    kind: z.enum(["selection", "interaction"]),
  })
  .strict();
export async function saveContext(subject: Subject, input: unknown) {
  const parsed = contextSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_CONTEXT", 422);
  const body = parsed.data;
  const lesson = await lessonPublic(body.lessonId, subject);
  if (lesson.currentRevisionId !== body.revisionId)
    throw new ContentError("STALE_CONTENT", 409);
  const stage = lesson.stages.find((stage) => stage.id === body.stageId);
  if (!stage) throw new ContentError("INVALID_STAGE", 422);
  if (body.kind === "interaction" && stage.activityLocked)
    throw new ContentError("STAGE_LOCKED", 403);
  await db.transaction(async (tx) => {
    await tx.execute(sql`INSERT INTO selected_context(subject_id,lesson_id,stage_id) VALUES (${subject.id},${body.lessonId},${body.stageId})
      ON CONFLICT(subject_id) DO UPDATE SET lesson_id=excluded.lesson_id,stage_id=excluded.stage_id,updated_at=now()`);
    if (body.kind === "interaction")
      await tx.execute(sql`INSERT INTO last_activity(subject_id,lesson_id,stage_id,source_route) VALUES (${subject.id},${body.lessonId},${body.stageId},${"/classroom/" + encodeURIComponent(body.lessonId)})
      ON CONFLICT(subject_id) DO UPDATE SET lesson_id=excluded.lesson_id,stage_id=excluded.stage_id,source_route=excluded.source_route,updated_at=now()`);
  });
  return { saved: true };
}
const draftSchema = z
  .object({
    lessonId: z.string().max(120),
    revisionId: z.string().max(120),
    stageId: z.string().max(120),
    version: z.number().int().nonnegative(),
    input: z.unknown().refine((value) => value !== undefined),
  })
  .strict();
export async function saveDraft(subject: Subject, input: unknown) {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_DRAFT", 422);
  const body = parsed.data;
  const lesson = await lessonPublic(body.lessonId, subject);
  if (lesson.currentRevisionId !== body.revisionId)
    throw new ContentError("STALE_CONTENT", 409);
  const stage = lesson.stages.find((stage) => stage.id === body.stageId);
  if (!stage || stage.activityLocked || stage.kind !== "exercise")
    throw new ContentError("STAGE_LOCKED", 403);
  const result =
    await db.execute(sql`INSERT INTO drafts(subject_id,stage_id,local_version,input) VALUES (${subject.id},${body.stageId},${body.version},${JSON.stringify(body.input)}::jsonb)
    ON CONFLICT(subject_id,stage_id) DO UPDATE SET local_version=excluded.local_version,input=excluded.input,updated_at=now()
    WHERE drafts.local_version<excluded.local_version OR (drafts.local_version=excluded.local_version AND drafts.input=excluded.input) RETURNING stage_id`);
  if (!result.rows.length)
    throw new ContentError("DRAFT_VERSION_CONFLICT", 409);
  return { saved: true };
}
export async function readDraft(
  subject: Subject,
  lessonId: string,
  revisionId: string,
  stageId: string,
) {
  const lesson = await lessonPublic(lessonId, subject);
  if (
    lesson.currentRevisionId !== revisionId ||
    !lesson.stages.some((stage) => stage.id === stageId)
  )
    throw new ContentError("STALE_CONTENT", 409);
  const rows = await db.execute(
    sql`SELECT local_version AS version,input,updated_at FROM drafts WHERE subject_id=${subject.id} AND stage_id=${stageId}`,
  );
  return rows.rows[0] ?? null;
}
const reportSchema = z
  .object({
    message: z.string().min(5).max(1000),
    lessonId: z.string().max(120).nullable(),
    stageId: z.string().max(120).nullable(),
  })
  .strict();
export async function reportProblem(subject: Subject, input: unknown) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_REPORT", 422);
  const { lessonId, stageId } = parsed.data;
  if (stageId && !lessonId) throw new ContentError("INVALID_REPORT", 422);
  if (lessonId) {
    const lesson = await lessonPublic(lessonId, subject);
    if (stageId && !lesson.stages.some((s) => s.id === stageId))
      throw new ContentError("INVALID_REPORT", 422);
  }
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO support_reports(id,subject_id,message,lesson_id,stage_id) VALUES (${id},${subject.id},${parsed.data.message},${parsed.data.lessonId},${parsed.data.stageId})`,
  );
  return { reportId: id, saved: true };
}
