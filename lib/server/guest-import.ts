import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { demoContentAllowed } from "../contracts/content";
import { ContentError } from "./content";
import { recomputeProgress } from "./progression";
import { gradeAnswer } from "../domain/learning/grading";
import {
  compare,
  fraction,
  maximum,
  numeric,
} from "../domain/learning/scoring";
import { fullAttemptFraction } from "../domain/learning/attempt-score";
import {
  hasVideoCredit,
  unionRanges,
  type WatchRange,
} from "../domain/learning/watch-ranges";

const draftSchema = z
  .object({
    scope: z.string().max(120),
    lessonId: z.string().max(120),
    revisionId: z.string().max(120),
    stageId: z.string().max(120),
    input: z.unknown().refine((value) => value !== undefined),
    version: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
  })
  .strict();
const importSchema = z
  .object({
    guestBatchId: z.string().uuid(),
    mergeConsent: z.boolean(),
    drafts: z.array(draftSchema).max(24),
  })
  .strict();
type Summary = {
  importId: string;
  importedAttempts: number;
  importedWatchSessions: number;
  archivedDrafts: number;
  draftConflicts: number;
  acknowledged: true;
};

export async function importPreview(
  userId: string,
  guestId: string,
  canAutoImport: boolean,
) {
  const counts =
    await db.execute(sql`SELECT (SELECT count(*)::int FROM learning_attempts a WHERE a.subject_id=${guestId} AND NOT EXISTS(SELECT 1 FROM guest_attempt_links k WHERE k.user_id=${userId} AND k.source_attempt_id=a.id)) AS attempts,
    (SELECT count(*)::int FROM watch_sessions w WHERE w.subject_id=${guestId} AND (jsonb_array_length(w.valid_ranges)>0 OR w.last_position_ms>0) AND NOT EXISTS(SELECT 1 FROM guest_watch_links k WHERE k.user_id=${userId} AND k.source_watch_id=w.id)) AS watches,
    (SELECT count(*)::int FROM learning_attempts WHERE subject_id=${userId}) AS account_attempts`);
  return {
    guestId,
    attemptCount: Number(counts.rows[0].attempts),
    watchCount: Number(counts.rows[0].watches),
    accountAttemptCount: Number(counts.rows[0].account_attempts),
    canAutoImport,
    requiresConsent: !canAutoImport,
    preservesAccountHistory: true,
  };
}

export async function importGuest(
  userId: string,
  guestId: string,
  input: unknown,
  canAutoImport: boolean,
): Promise<Summary> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_IMPORT", 422);
  const body = parsed.data;
  if (!body.mergeConsent && !canAutoImport)
    throw new ContentError("IMPORT_CONSENT_REQUIRED", 409);
  const checksum = createHash("sha256")
    .update(JSON.stringify({ guestId, drafts: body.drafts }))
    .digest("hex");
  return db.transaction(async (tx) => {
    // Stable lock ordering also coordinates active attempt/watch writes on either identity.
    for (const id of [userId, guestId].sort())
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`,
      );
    const identities = await tx.execute(
      sql`SELECT id,kind FROM subjects WHERE id IN (${userId},${guestId})`,
    );
    if (
      identities.rows.find((row) => row.id === userId)?.kind !== "user" ||
      identities.rows.find((row) => row.id === guestId)?.kind !== "guest"
    )
      throw new ContentError("INVALID_IMPORT_IDENTITY", 403);
    const existing = await tx.execute(
      sql`SELECT source_guest_id,checksum,summary FROM guest_imports WHERE guest_batch_id=${body.guestBatchId} AND target_user_id=${userId}`,
    );
    if (existing.rows[0]) {
      if (
        existing.rows[0].source_guest_id !== guestId ||
        existing.rows[0].checksum !== checksum
      )
        throw new ContentError("IMPORT_BATCH_CONFLICT", 409);
      return existing.rows[0].summary as Summary;
    }
    const importId = randomUUID();
    await tx.execute(
      sql`INSERT INTO guest_imports(id,guest_batch_id,target_user_id,source_guest_id,status,consent_at,checksum) VALUES (${importId},${body.guestBatchId},${userId},${guestId},'pending',CASE WHEN ${body.mergeConsent} THEN now() ELSE NULL END,${checksum})`,
    );
    const attempts = await tx.execute(
      sql`SELECT a.*,l.id AS lesson_id,l.sequence_number,l.current_revision_id,l.published,r.demo_only FROM learning_attempts a JOIN lesson_revisions r ON r.id=a.revision_id JOIN lessons l ON l.id=r.lesson_id WHERE a.subject_id=${guestId} ORDER BY a.completed_at,a.id`,
    );
    const affectedLessons = new Set<string>();
    const affectedQuestions = new Map<
      string,
      { id: string; revision: number }
    >();
    let importedAttempts = 0;
    for (const attempt of attempts.rows) {
      if (Number(attempt.sequence_number) > 3)
        throw new ContentError("PAID_GUEST_HISTORY_REJECTED", 403);
      if (attempt.current_revision_id !== attempt.revision_id)
        throw new ContentError("STALE_GUEST_CONTENT", 409);
      if (!attempt.published || (attempt.demo_only && !demoContentAllowed()))
        throw new ContentError("GUEST_CONTENT_UNAVAILABLE", 409);
      affectedLessons.add(attempt.lesson_id as string);
      const linked = await tx.execute(
        sql`SELECT 1 FROM guest_attempt_links WHERE user_id=${userId} AND source_attempt_id=${attempt.id as string}`,
      );
      if (linked.rows.length) continue;
      const rows =
        await tx.execute(sql`SELECT qr.question_id,qr.question_revision,qr.answer_payload,q.answer_key,q.grading_kind,q.stage_id FROM question_results qr
        JOIN questions q ON q.id=qr.question_id AND q.revision=qr.question_revision WHERE qr.attempt_id=${attempt.id as string} ORDER BY qr.question_id`);
      if (rows.rows.some((row) => row.stage_id !== attempt.stage_id))
        throw new ContentError("INVALID_GUEST_ATTEMPT", 409);
      const count = await tx.execute(
        sql`SELECT count(*)::int AS total FROM questions WHERE stage_id=${attempt.stage_id as string} AND active`,
      );
      if (
        attempt.kind === "full" &&
        rows.rows.length !== Number(count.rows[0].total)
      )
        throw new ContentError("INVALID_GUEST_ATTEMPT", 409);
      const results = rows.rows.map((row) => ({
        id: row.question_id as string,
        revision: Number(row.question_revision),
        payload: row.answer_payload,
        correct: gradeAnswer(
          row.grading_kind as string,
          row.answer_payload as Parameters<typeof gradeAnswer>[1],
          row.answer_key,
        ),
      }));
      const score = fullAttemptFraction(
        results.filter((result) => result.correct).length,
        results.length,
      );
      const id = randomUUID();
      await tx.execute(sql`INSERT INTO learning_attempts(id,subject_id,revision_id,stage_id,kind,started_at,completed_at,completed,idempotency_key,request_hash,score)
        SELECT ${id},${userId},revision_id,stage_id,kind,started_at,completed_at,completed,${"import:" + attempt.id},request_hash,${score} FROM learning_attempts WHERE id=${attempt.id as string}`);
      for (const result of results) {
        await tx.execute(
          sql`INSERT INTO question_results(attempt_id,question_id,question_revision,correct,answer_payload) VALUES (${id},${result.id},${result.revision},${result.correct},${JSON.stringify(result.payload)}::jsonb)`,
        );
        affectedQuestions.set(`${result.id}@${result.revision}`, {
          id: result.id,
          revision: result.revision,
        });
      }
      await tx.execute(
        sql`INSERT INTO guest_attempt_links(user_id,source_attempt_id,target_attempt_id) VALUES (${userId},${attempt.id as string},${id})`,
      );
      importedAttempts++;
    }
    const watches = await tx.execute(
      sql`SELECT w.*,r.lesson_id,r.duration_ms,l.sequence_number,l.current_revision_id,l.published,r.demo_only FROM watch_sessions w JOIN lesson_revisions r ON r.id=w.revision_id JOIN lessons l ON l.id=r.lesson_id WHERE w.subject_id=${guestId}`,
    );
    let importedWatchSessions = 0;
    for (const watch of watches.rows) {
      if (!watch.published || (watch.demo_only && !demoContentAllowed()))
        throw new ContentError("GUEST_CONTENT_UNAVAILABLE", 409);
      if (
        Number(watch.sequence_number) > 3 ||
        watch.current_revision_id !== watch.revision_id
      )
        throw new ContentError("INVALID_GUEST_WATCH_HISTORY", 409);
      const linked = await tx.execute(
        sql`SELECT 1 FROM guest_watch_links WHERE user_id=${userId} AND source_watch_id=${watch.id as string}`,
      );
      if (linked.rows.length) continue;
      const id = randomUUID();
      await tx.execute(sql`INSERT INTO watch_sessions(id,subject_id,revision_id,video_asset_id,valid_ranges,max_playback_ms,last_position_ms,sequence,credited_at,created_at,updated_at)
        SELECT ${id},${userId},revision_id,video_asset_id,valid_ranges,max_playback_ms,last_position_ms,0,credited_at,created_at,updated_at FROM watch_sessions WHERE id=${watch.id as string}`);
      await tx.execute(
        sql`INSERT INTO guest_watch_links(user_id,source_watch_id,target_watch_id) VALUES (${userId},${watch.id as string},${id})`,
      );
      affectedLessons.add(watch.lesson_id as string);
      importedWatchSessions++;
    }
    // Derive transitions from the combined authoritative timeline. Existing immutable events remain untouched.
    for (const question of Array.from(affectedQuestions.values())) {
      const timeline =
        await tx.execute(sql`SELECT a.id,qr.correct FROM question_results qr JOIN learning_attempts a ON a.id=qr.attempt_id
        WHERE a.subject_id=${userId} AND qr.question_id=${question.id} AND qr.question_revision=${question.revision} ORDER BY a.completed_at,a.id`);
      let wrong = false;
      let corrected = false;
      let lastWrong: string | null = null;
      let lastCorrect: string | null = null;
      for (const row of timeline.rows) {
        const kind = row.correct
          ? wrong
            ? "corrected"
            : null
          : corrected
            ? "reopened"
            : "incorrect";
        if (kind)
          await tx.execute(sql`INSERT INTO mistake_events(id,subject_id,question_id,question_revision,attempt_id,kind,event_at)
          SELECT ${randomUUID()},${userId},${question.id},${question.revision},id,${kind},completed_at FROM learning_attempts WHERE id=${row.id as string}
          ON CONFLICT(attempt_id,question_id,question_revision) DO NOTHING`);
        if (row.correct) {
          lastCorrect = row.id as string;
          if (wrong) corrected = true;
          wrong = false;
        } else {
          lastWrong = row.id as string;
          wrong = true;
        }
      }
      if (lastWrong)
        await tx.execute(sql`INSERT INTO mistake_current(subject_id,question_id,question_revision,status,latest_wrong_at,latest_valid_answer_at)
        VALUES (${userId},${question.id},${question.revision},${wrong ? "needsReview" : "corrected"},(SELECT completed_at FROM learning_attempts WHERE id=${lastWrong}),
          (SELECT completed_at FROM learning_attempts WHERE id=${lastCorrect}))
        ON CONFLICT(subject_id,question_id,question_revision) DO UPDATE SET status=excluded.status,latest_wrong_at=excluded.latest_wrong_at,latest_valid_answer_at=excluded.latest_valid_answer_at`);
    }
    // Preserve authoritative previously earned fractions when a later best baseline excludes older corrections.
    const sourceProgress =
      await tx.execute(sql`SELECT ep.*,r.lesson_id,l.sequence_number,l.current_revision_id,s.revision_id
      FROM exercise_progress ep JOIN stages s ON s.id=ep.stage_id JOIN lesson_revisions r ON r.id=s.revision_id JOIN lessons l ON l.id=r.lesson_id WHERE ep.subject_id=${guestId}`);
    for (const source of sourceProgress.rows) {
      if (
        Number(source.sequence_number) > 3 ||
        source.current_revision_id !== source.revision_id
      )
        throw new ContentError("INVALID_GUEST_PROGRESS", 409);
      const earned = fraction(
        source.earned_n as string,
        source.earned_d as string,
      );
      if (compare(earned, fraction(1)) > 0)
        throw new ContentError("INVALID_GUEST_PROGRESS", 409);
      if (compare(earned, fraction(0)) > 0) {
        const proof = await tx.execute(
          sql`SELECT 1 FROM guest_attempt_links WHERE user_id=${userId} AND source_attempt_id=${(source.best_attempt_id as string) ?? ""}`,
        );
        if (!proof.rows.length)
          throw new ContentError("INVALID_GUEST_PROGRESS", 409);
      }
      const target = await tx.execute(
        sql`SELECT earned_n,earned_d FROM exercise_progress WHERE subject_id=${userId} AND stage_id=${source.stage_id as string}`,
      );
      const merged = maximum(
        earned,
        target.rows[0]
          ? fraction(
              target.rows[0].earned_n as string,
              target.rows[0].earned_d as string,
            )
          : fraction(0),
      );
      await tx.execute(sql`INSERT INTO exercise_progress(subject_id,stage_id,earned_fraction,earned_n,earned_d) VALUES (${userId},${source.stage_id as string},${numeric(merged)},${merged.n.toString()},${merged.d.toString()})
        ON CONFLICT(subject_id,stage_id) DO UPDATE SET earned_fraction=excluded.earned_fraction,earned_n=excluded.earned_n,earned_d=excluded.earned_d`);
      affectedLessons.add(source.lesson_id as string);
    }
    for (const lessonId of Array.from(affectedLessons)) {
      const rows = await tx.execute(
        sql`SELECT w.valid_ranges,r.id,r.duration_ms FROM watch_sessions w JOIN lesson_revisions r ON r.id=w.revision_id WHERE w.subject_id=${userId} AND r.lesson_id=${lessonId}`,
      );
      const revision = rows.rows[0];
      const credited = Boolean(
        revision &&
          hasVideoCredit(
            unionRanges(
              rows.rows.flatMap((row) => row.valid_ranges as WatchRange[]),
              Number(revision.duration_ms),
            ),
            Number(revision.duration_ms),
          ),
      );
      await tx.execute(sql`INSERT INTO lesson_progress(subject_id,lesson_id,video_credited,current_revision,unlocked_at)
        VALUES (${userId},${lessonId},${credited},${(revision?.id as string) ?? null},CASE WHEN ${lessonId}='de-01' THEN now() ELSE NULL END)
        ON CONFLICT(subject_id,lesson_id) DO UPDATE SET video_credited=lesson_progress.video_credited OR excluded.video_credited`);
      await recomputeProgress(tx, userId, lessonId);
    }
    let draftConflicts = 0;
    for (const draft of body.drafts) {
      if (draft.scope !== guestId)
        throw new ContentError("INVALID_DRAFT_SCOPE", 403);
      const rows =
        await tx.execute(sql`SELECT s.id FROM stages s JOIN lesson_revisions r ON r.id=s.revision_id JOIN lessons l ON l.id=r.lesson_id
        WHERE s.id=${draft.stageId} AND r.id=${draft.revisionId} AND l.id=${draft.lessonId} AND l.sequence_number<=3 AND l.current_revision_id=r.id AND l.published AND (NOT r.demo_only OR ${demoContentAllowed()})`);
      if (!rows.rows.length)
        throw new ContentError("INVALID_IMPORT_DRAFT", 422);
      await tx.execute(
        sql`INSERT INTO guest_import_drafts(import_id,stage_id,input,updated_at) VALUES (${importId},${draft.stageId},${JSON.stringify(draft.input)}::jsonb,${draft.updatedAt}::timestamptz)`,
      );
      const inserted = await tx.execute(
        sql`INSERT INTO drafts(subject_id,stage_id,local_version,input,updated_at) VALUES (${userId},${draft.stageId},${draft.version},${JSON.stringify(draft.input)}::jsonb,${draft.updatedAt}::timestamptz) ON CONFLICT(subject_id,stage_id) DO NOTHING RETURNING stage_id`,
      );
      if (!inserted.rows.length) draftConflicts++;
    }
    await tx.execute(sql`INSERT INTO last_activity(subject_id,lesson_id,stage_id,draft_id,source_route,scroll_state,updated_at)
      SELECT ${userId},lesson_id,stage_id,draft_id,source_route,scroll_state,updated_at FROM last_activity WHERE subject_id=${guestId}
      ON CONFLICT(subject_id) DO UPDATE SET lesson_id=excluded.lesson_id,stage_id=excluded.stage_id,draft_id=excluded.draft_id,source_route=excluded.source_route,scroll_state=excluded.scroll_state,updated_at=excluded.updated_at WHERE last_activity.updated_at<excluded.updated_at`);
    const summary: Summary = {
      importId,
      importedAttempts,
      importedWatchSessions,
      archivedDrafts: body.drafts.length,
      draftConflicts,
      acknowledged: true,
    };
    await tx.execute(
      sql`UPDATE guest_imports SET status='completed',completed_at=now(),summary=${JSON.stringify(summary)}::jsonb WHERE id=${importId}`,
    );
    return summary;
  });
}
