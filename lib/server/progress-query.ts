import { sql } from "drizzle-orm";
import { db } from "./db";
import { catalog } from "./content";
import type { Subject } from "./identity";

export async function subjectProgress(subject: Subject) {
  const lessons = await catalog(subject);
  const unlocked = lessons.filter((lesson) => lesson.access.pedagogical);
  const activity = await db.execute(
    sql`SELECT lesson_id,stage_id,draft_id,source_route,scroll_state,updated_at FROM last_activity WHERE subject_id=${subject.id}`,
  );
  const exercises =
    await db.execute(sql`SELECT ep.stage_id,ep.earned_fraction,b.score AS best_full_score,l.score AS last_full_score
    FROM exercise_progress ep LEFT JOIN learning_attempts b ON b.id=ep.best_attempt_id LEFT JOIN learning_attempts l ON l.id=ep.last_attempt_id
    WHERE ep.subject_id=${subject.id}`);
  const selected = await db.execute(
    sql`SELECT lesson_id,stage_id FROM selected_context WHERE subject_id=${subject.id}`,
  );
  const days = await db.execute(
    sql`SELECT DISTINCT to_char(completed_at AT TIME ZONE 'Asia/Tehran','YYYY-MM-DD') AS day FROM learning_attempts WHERE subject_id=${subject.id} AND kind='full' ORDER BY day DESC LIMIT 180`,
  );
  const review = await db.execute(
    sql`SELECT DISTINCT r.lesson_id FROM mistake_current m JOIN questions q ON q.id=m.question_id AND q.revision=m.question_revision JOIN stages s ON s.id=q.stage_id JOIN lesson_revisions r ON r.id=s.revision_id WHERE m.subject_id=${subject.id} AND m.status='needsReview'`,
  );
  return {
    needsReview: review.rows.map((row) => row.lesson_id),
    subject,
    lessons,
    selectedContext: selected.rows[0] ?? null,
    activityDays: days.rows.map((row) => row.day as string),
    currentLesson: unlocked[unlocked.length - 1]?.id ?? "de-01",
    lastActivity: activity.rows[0] ?? null,
    exercises: exercises.rows.map((row) => ({
      stageId: row.stage_id,
      earnedFraction: Number(row.earned_fraction),
      bestFullScore:
        row.best_full_score === null ? null : Number(row.best_full_score),
      lastFullScore:
        row.last_full_score === null ? null : Number(row.last_full_score),
    })),
  };
}
