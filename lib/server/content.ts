import { sql } from "drizzle-orm";
import { db } from "./db";
import {
  demoContentAllowed,
  publicQuestionSchema,
  type PublicStage,
} from "../contracts/content";

export class ContentError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

export async function catalog() {
  const rows =
    await db.execute(sql`SELECT l.id,l.sequence_number,l.short_title,l.published,r.demo_only
    FROM lessons l LEFT JOIN lesson_revisions r ON r.id=l.current_revision_id
    WHERE l.course_id='shish-de-60' ORDER BY l.sequence_number`);
  return rows.rows.map((row) => {
    const published =
      Boolean(row.published) && (!row.demo_only || demoContentAllowed());
    return {
      id: row.id,
      number: row.sequence_number,
      title: row.short_title,
      published,
      demoOnly: Boolean(row.demo_only),
      access: {
        pedagogical: row.sequence_number === 1,
        commercial: Number(row.sequence_number) <= 3,
        canStart: published && row.sequence_number === 1,
        reason: !published
          ? "CONTENT_UNAVAILABLE"
          : row.sequence_number === 1
            ? null
            : "PREREQUISITE_REQUIRED",
      },
    };
  });
}

export async function lessonPublic(id: string) {
  const result =
    await db.execute(sql`SELECT l.id,l.sequence_number,l.short_title,l.published,
    r.id AS revision_id,r.demo_only,r.video_url,r.duration_ms
    FROM lessons l JOIN lesson_revisions r ON r.id=l.current_revision_id WHERE l.id=${id}`);
  const row = result.rows[0];
  if (!row || !row.published || (row.demo_only && !demoContentAllowed()))
    throw new ContentError("CONTENT_UNAVAILABLE", 404);
  // Until subject-aware progression lands, fail closed for every successor.
  if (row.sequence_number !== 1)
    throw new ContentError("PREREQUISITE_REQUIRED", 403);
  const stageRows = await db.execute(
    sql`SELECT id,stage_order,kind,exercise_type FROM stages WHERE revision_id=${row.revision_id as string} ORDER BY stage_order`,
  );
  const stages: PublicStage[] = [];
  for (const stage of stageRows.rows) {
    const questions = await db.execute(
      sql`SELECT id,revision,public_config FROM questions WHERE stage_id=${stage.id as string} AND active ORDER BY stable_order`,
    );
    stages.push({
      id: stage.id as string,
      order: stage.stage_order as number,
      kind: stage.kind as "video" | "exercise",
      exerciseKind: stage.exercise_type as string | null,
      activityLocked: Number(stage.stage_order) > 0,
      questions: questions.rows.map((q) => ({
        id: q.id as string,
        revision: q.revision as number,
        ...publicQuestionSchema.parse(q.public_config),
      })),
    });
  }
  return {
    id: row.id,
    sequenceNumber: row.sequence_number,
    title: row.short_title,
    currentRevisionId: row.revision_id,
    demoOnly: row.demo_only,
    video: {
      assetId: `${row.id}-video`,
      url: row.video_url,
      durationMs: row.duration_ms,
      captionsUrl: "/demo/synthetic.vtt",
    },
    stages,
  };
}
