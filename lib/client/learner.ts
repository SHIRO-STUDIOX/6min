import { api } from "./api";
import type { Learner, ProgressDTO } from "../contracts/experience";

let pending: Promise<Learner> | null = null;
export function loadLearner(): Promise<Learner> {
  pending ??= buildLearner().finally(() => {
    pending = null;
  });
  return pending;
}
async function buildLearner(retry = false): Promise<Learner> {
  let user: Learner["user"] = null;
  try {
    user = await api<NonNullable<Learner["user"]>>("/me");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "AUTHENTICATION_REQUIRED"
    )
      throw error;
  }
  const guest = user
    ? null
    : await api<{ guestId: string }>("/guest/bootstrap", "POST");
  const scope = user?.id ?? guest!.guestId;
  const progress = await api<ProgressDTO>("/me/progress");
  if (progress.subject.id !== scope) {
    if (!retry) return buildLearner(true);
    throw new Error("AUTHENTICATION_REQUIRED");
  }
  return { kind: user ? "user" : "guest", user, scope, progress };
}
