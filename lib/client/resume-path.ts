import type { ProgressDTO } from "../contracts/experience";
export function resumePath(progress: ProgressDTO) {
  const last = progress.lastActivity;
  return `/classroom/${encodeURIComponent(last?.lesson_id ?? progress.currentLesson)}${last?.stage_id ? `?stage=${encodeURIComponent(last.stage_id)}&restore=1` : ""}`;
}
