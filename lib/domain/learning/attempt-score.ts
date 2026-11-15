/** Full-attempt fraction only; partial drafts must never be scored. */
export function fullAttemptFraction(correct: number, total: number): number {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0 || correct < 0 || correct > total) {
    throw new RangeError("Invalid full attempt counts");
  }
  return correct / total;
}
