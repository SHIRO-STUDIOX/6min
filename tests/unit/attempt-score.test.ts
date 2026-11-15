import { describe, expect, it } from "vitest";
import { fullAttemptFraction } from "../../lib/domain/learning/attempt-score";

describe("LE-07 full attempt fraction", () => {
  it.each([[3, 5, 0.6], [0, 5, 0], [5, 5, 1]])("scores %i/%i", (correct, total, score) => {
    expect(fullAttemptFraction(correct, total)).toBe(score);
  });
  it.each([[0, 0], [-1, 5], [6, 5], [1.5, 5], [1, NaN]])("rejects invalid counts %s/%s", (correct, total) => {
    expect(() => fullAttemptFraction(correct, total)).toThrow(RangeError);
  });
});
