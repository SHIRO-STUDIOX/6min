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
  return {
    lessons,
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
