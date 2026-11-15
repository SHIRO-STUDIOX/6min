import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { assertCommercialAccess } from "./access";
import { recomputeProgress } from "./progression";
import { ContentError } from "./content";
import type { Subject } from "./identity";
import { demoContentAllowed } from "../contracts/content";
import {
  hasVideoCredit,
  unionRanges,
  watchedMs,
  type WatchRange,
} from "../domain/learning/watch-ranges";

const startSchema = z
  .object({
    lessonId: z.string().max(120),
    revisionId: z.string().max(120),
    videoAssetId: z.string().max(120),
  })
  .strict();
const updateSchema = z
  .object({
    sequence: z.number().int().positive(),
    lastPositionMs: z.number().int().nonnegative(),
    playedIntervals: z
      .array(
        z
          .object({
            fromMs: z.number().int().nonnegative(),
            toMs: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();

export async function startWatch(subject: Subject, input: unknown) {
  const body = startSchema.safeParse(input);
  if (!body.success) throw new ContentError("INVALID_WATCH_SESSION", 422);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${subject.id},0))`,
    );
    const result = await tx.execute(
      sql`SELECT l.sequence_number,l.published,l.current_revision_id,r.demo_only,r.duration_ms,r.video_asset_id FROM lessons l JOIN lesson_revisions r ON r.id=l.current_revision_id WHERE l.id=${body.data.lessonId}`,
    );
    const lesson = result.rows[0];
    if (!lesson?.published || (lesson.demo_only && !demoContentAllowed()))
      throw new ContentError("CONTENT_UNAVAILABLE", 404);
    if (
      lesson.current_revision_id !== body.data.revisionId ||
      lesson.video_asset_id !== body.data.videoAssetId
    )
      throw new ContentError("STALE_CONTENT", 409);
    await assertCommercialAccess(tx, subject, Number(lesson.sequence_number));
    const progress = await tx.execute(
      sql`SELECT unlocked_at FROM lesson_progress WHERE subject_id=${subject.id} AND lesson_id=${body.data.lessonId}`,
    );
    if (lesson.sequence_number !== 1 && !progress.rows[0]?.unlocked_at)
      throw new ContentError("PREREQUISITE_REQUIRED", 403);
    const old = await tx.execute(
      sql`SELECT valid_ranges,last_position_ms FROM watch_sessions WHERE subject_id=${subject.id} AND revision_id=${body.data.revisionId} ORDER BY updated_at DESC`,
    );
    const ranges = unionRanges(
      old.rows.flatMap((row) => row.valid_ranges as WatchRange[]),
      Number(lesson.duration_ms),
    );
    const positionMs = Number(old.rows[0]?.last_position_ms ?? 0);
    const id = randomUUID();
    await tx.execute(
      sql`INSERT INTO watch_sessions(id,subject_id,revision_id,video_asset_id,valid_ranges,last_position_ms) VALUES (${id},${subject.id},${body.data.revisionId},${body.data.videoAssetId},${JSON.stringify(ranges)}::jsonb,${positionMs})`,
    );
    return {
      watchSessionId: id,
      positionMs,
      coverage: watchedMs(ranges) / Number(lesson.duration_ms),
      credited: hasVideoCredit(ranges, Number(lesson.duration_ms)),
    };
  });
}

export async function updateWatch(
  subject: Subject,
  id: string,
  input: unknown,
) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_WATCH_EVENT", 422);
  const body = parsed.data;
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${subject.id},0))`,
    );
    const result =
      await tx.execute(sql`SELECT w.*,r.duration_ms,r.lesson_id,l.current_revision_id,l.published,r.demo_only,
      EXTRACT(EPOCH FROM (now()-w.updated_at))*1000 AS elapsed_ms
      FROM watch_sessions w JOIN lesson_revisions r ON r.id=w.revision_id JOIN lessons l ON l.id=r.lesson_id
      WHERE w.id=${id} AND w.subject_id=${subject.id} FOR UPDATE OF w`);
    const session = result.rows[0];
    if (!session) throw new ContentError("WATCH_SESSION_NOT_FOUND", 404);
    if (!session.published || (session.demo_only && !demoContentAllowed()))
      throw new ContentError("CONTENT_UNAVAILABLE", 404);
    if (session.current_revision_id !== session.revision_id)
      throw new ContentError("STALE_CONTENT", 409);
    const duration = Number(session.duration_ms);
    if (body.sequence <= Number(session.sequence)) {
      return {
        coverage: watchedMs(session.valid_ranges as WatchRange[]) / duration,
        credited: Boolean(session.credited_at),
        positionMs: session.last_position_ms,
        sequence: session.sequence,
      };
    }
    if (body.sequence !== Number(session.sequence) + 1)
      throw new ContentError("WATCH_SEQUENCE_CONFLICT", 409);
    if (
      body.lastPositionMs > duration ||
      body.playedIntervals.some(
        (range) => range.toMs <= range.fromMs || range.toMs > duration,
      )
    )
      throw new ContentError("INVALID_WATCH_EVENT", 422);
    const incoming = unionRanges(
      body.playedIntervals.map((range) => [range.fromMs, range.toMs]),
      duration,
    );
    if (watchedMs(incoming) > Number(session.elapsed_ms) * 2 + 250)
      throw new ContentError("IMPLAUSIBLE_PLAYBACK", 422);
    const all = await tx.execute(
      sql`SELECT valid_ranges FROM watch_sessions WHERE subject_id=${subject.id} AND revision_id=${session.revision_id as string}`,
    );
    const merged = unionRanges(
      [
        ...all.rows.flatMap((row) => row.valid_ranges as WatchRange[]),
        ...incoming,
      ],
      duration,
    );
    const credited = hasVideoCredit(merged, duration);
    await tx.execute(sql`UPDATE watch_sessions SET valid_ranges=${JSON.stringify(merged)}::jsonb,last_position_ms=${body.lastPositionMs},sequence=${body.sequence},
      max_playback_ms=GREATEST(max_playback_ms,${body.lastPositionMs}),credited_at=CASE WHEN ${credited} THEN COALESCE(credited_at,now()) ELSE credited_at END,updated_at=now() WHERE id=${id}`);
    await tx.execute(sql`INSERT INTO lesson_progress(subject_id,lesson_id,video_credited,current_revision,last_activity_at,unlocked_at)
      VALUES (${subject.id},${session.lesson_id as string},${credited},${session.revision_id as string},now(),CASE WHEN ${session.lesson_id as string}='de-01' THEN now() ELSE NULL END)
      ON CONFLICT(subject_id,lesson_id) DO UPDATE SET video_credited=lesson_progress.video_credited OR excluded.video_credited,last_activity_at=now()`);
    const progression = await recomputeProgress(
      tx,
      subject.id,
      session.lesson_id as string,
    );
    return {
      ...progression,
      coverage: watchedMs(merged) / duration,
      credited,
      positionMs: body.lastPositionMs,
      sequence: body.sequence,
    };
  });
}
