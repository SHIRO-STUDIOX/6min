import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { commercialAllowed } from "./access";
import { ContentError } from "./content";
import type { Subject } from "./identity";
import { demoContentAllowed, publicQuestionSchema } from "../contracts/content";

const cursorSchema = z
  .object({
    at: z.string().datetime(),
    id: z.string().max(120),
    revision: z.number().int().positive(),
  })
  .strict();
export async function mistakes(
  subject: Subject,
  cursor?: string,
  status = "needsReview",
) {
  if (!["needsReview", "corrected"].includes(status))
    throw new ContentError("INVALID_STATUS", 422);
  let filter = sql``;
  if (cursor) {
    if (cursor.length > 500) throw new ContentError("INVALID_CURSOR", 422);
    try {
      const value = cursorSchema.parse(
        JSON.parse(Buffer.from(cursor, "base64url").toString()),
      );
      filter = sql`AND (m.latest_wrong_at,m.question_id,m.question_revision)<(${value.at}::timestamptz,${value.id},${value.revision})`;
    } catch {
      throw new ContentError("INVALID_CURSOR", 422);
    }
  }
  const entitled = await commercialAllowed(subject, 4);
  const rows =
    await db.execute(sql`SELECT m.question_id,m.question_revision,m.status,
    to_char(m.latest_wrong_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS latest_wrong_at,
    q.public_config,s.id AS stage_id,s.exercise_type,l.id AS lesson_id,r.id AS revision_id
    FROM mistake_current m JOIN questions q ON q.id=m.question_id AND q.revision=m.question_revision
    JOIN stages s ON s.id=q.stage_id JOIN lesson_revisions r ON r.id=s.revision_id JOIN lessons l ON l.id=r.lesson_id
    WHERE m.subject_id=${subject.id} AND m.status=${status} AND l.published AND l.current_revision_id=r.id
    AND (l.sequence_number<=3 OR ${entitled}) AND (NOT r.demo_only OR ${demoContentAllowed()}) ${filter}
    ORDER BY m.latest_wrong_at DESC,m.question_id DESC,m.question_revision DESC LIMIT 51`);
  const items = rows.rows.slice(0, 50).map((row) => ({
    questionId: row.question_id,
    revision: row.question_revision,
    status: row.status,
    latestWrongAt: row.latest_wrong_at,
    stageId: row.stage_id,
    exerciseKind: row.exercise_type,
    lessonId: row.lesson_id,
    revisionId: row.revision_id,
    ...publicQuestionSchema.parse(row.public_config),
  }));
  const last = items[items.length - 1];
  return {
    items,
    nextCursor:
      rows.rows.length > 50 && last
        ? Buffer.from(
            JSON.stringify({
              at: last.latestWrongAt,
              id: last.questionId,
              revision: last.revision,
            }),
          ).toString("base64url")
        : null,
  };
}

const reviewSchema = z
  .object({
    questionRefs: z
      .array(
        z
          .object({
            id: z.string().min(1).max(120),
            revision: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
export async function reviewQuestions(subject: Subject, input: unknown) {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_REVIEW", 422);
  const items = [];
  const entitled = await commercialAllowed(subject, 4);
  for (const ref of parsed.data.questionRefs) {
    const rows =
      await db.execute(sql`SELECT q.id,q.revision,q.public_config,s.id AS stage_id,s.exercise_type,l.id AS lesson_id,r.id AS revision_id
      FROM mistake_current m JOIN questions q ON q.id=m.question_id AND q.revision=m.question_revision
      JOIN stages s ON s.id=q.stage_id JOIN lesson_revisions r ON r.id=s.revision_id JOIN lessons l ON l.id=r.lesson_id
      WHERE m.subject_id=${subject.id} AND m.question_id=${ref.id} AND m.question_revision=${ref.revision} AND m.status='needsReview'
      AND l.published AND l.current_revision_id=r.id AND (l.sequence_number<=3 OR ${entitled}) AND (NOT r.demo_only OR ${demoContentAllowed()})`);
    const row = rows.rows[0];
    if (!row) throw new ContentError("QUESTION_NOT_REVIEWABLE", 422);
    items.push({
      questionId: row.id,
      revision: row.revision,
      stageId: row.stage_id,
      exerciseKind: row.exercise_type,
      lessonId: row.lesson_id,
      revisionId: row.revision_id,
      ...publicQuestionSchema.parse(row.public_config),
    });
  }
  return { items };
}
