import { sql } from "drizzle-orm";
import { db } from "./db";
import { commercialAllowed } from "./access";
import { lessonAccess } from "../domain/identity/access";
import type { Subject } from "./identity";
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

export async function catalog(subject: Subject | null = null) {
  const entitled = await commercialAllowed(subject, 4);
  const rows =
    await db.execute(sql`SELECT l.id,l.sequence_number,l.short_title,l.published,r.demo_only,p.unlocked_at,p.effective_score,p.video_credited
    FROM lessons l LEFT JOIN lesson_revisions r ON r.id=l.current_revision_id
    LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.subject_id=${subject?.id ?? ""}
    WHERE l.course_id='shish-de-60' ORDER BY l.sequence_number`);
  return rows.rows.map((row) => {
    const published =
      Boolean(row.published) && (!row.demo_only || demoContentAllowed());
    return {
      id: row.id as string,
      number: Number(row.sequence_number),
      title: row.short_title as string,
      published,
      demoOnly: Boolean(row.demo_only),
      score: Number(row.effective_score ?? 0),
      videoCredited: Boolean(row.video_credited),
      access: lessonAccess({
        number: Number(row.sequence_number),
        published,
        pedagogical: row.sequence_number === 1 || Boolean(row.unlocked_at),
        entitled,
      }),
    };
  });
}

export async function lessonPublic(id: string, subject: Subject | null = null) {
  const result =
    await db.execute(sql`SELECT l.id,l.sequence_number,l.short_title,l.published,
    r.id AS revision_id,r.demo_only,r.video_url,r.duration_ms
    FROM lessons l JOIN lesson_revisions r ON r.id=l.current_revision_id WHERE l.id=${id}`);
  const row = result.rows[0];
  if (!row || !row.published || (row.demo_only && !demoContentAllowed()))
    throw new ContentError("CONTENT_UNAVAILABLE", 404);
  const progressRows = await db.execute(
    sql`SELECT video_credited,unlocked_at,effective_score FROM lesson_progress WHERE subject_id=${subject?.id ?? ""} AND lesson_id=${id}`,
  );
  const progress = progressRows.rows[0];
  const access = lessonAccess({
    number: Number(row.sequence_number),
    published: true,
    pedagogical: row.sequence_number === 1 || Boolean(progress?.unlocked_at),
    entitled: await commercialAllowed(subject, Number(row.sequence_number)),
  });
  if (!access.canStart)
    throw new ContentError(access.reason ?? "ACCESS_DENIED", 403);
  const completedRows = await db.execute(
    sql`SELECT DISTINCT stage_id FROM learning_attempts WHERE subject_id=${subject?.id ?? ""} AND revision_id=${row.revision_id as string} AND kind='full'`,
  );
  const completed = new Set(completedRows.rows.map((item) => item.stage_id));
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
      activityLocked:
        Number(stage.stage_order) > 0 &&
        (!progress?.video_credited ||
          stageRows.rows.some(
            (prior) =>
              prior.kind === "exercise" &&
              Number(prior.stage_order) < Number(stage.stage_order) &&
              !completed.has(prior.id),
          )),
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
    progress: {
      videoCredited: Boolean(progress?.video_credited),
      lessonScore: Number(progress?.effective_score ?? 0),
    },
    video: {
      assetId: `${row.id}-video`,
      url: row.video_url,
      durationMs: row.duration_ms,
      captionsUrl: "/demo/synthetic.vtt",
    },
    stages,
  };
}
