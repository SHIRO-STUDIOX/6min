import { expect, it } from "vitest";
import {
  hasVideoCredit,
  playedInterval,
  unionRanges,
  watchedMs,
} from "../../lib/domain/learning/watch-ranges";

it("LE-01/02/04 merges adjacent, overlapping, repeated and multi-session ranges exactly", () => {
  expect(hasVideoCredit([[0, 7999]], 10000)).toBe(false);
  expect(
    hasVideoCredit(
      [
        [0, 4000],
        [4000, 8000],
      ],
      10000,
    ),
  ).toBe(true);
  expect(
    watchedMs(
      unionRanges(
        [
          [0, 5000],
          [0, 5000],
          [1000, 4000],
        ],
        10000,
      ),
    ),
  ).toBe(5000);
  expect(
    unionRanges(
      [
        [-10, 5000],
        [4000, 20000],
      ],
      10000,
    ),
  ).toEqual([[0, 10000]]);
});
it("LE-03/05 rejects seek gaps, paused and buffering samples", () => {
  const before = { positionMs: 0, clockMs: 0, rate: 1, active: true };
  expect(
    playedInterval(before, { ...before, positionMs: 10000, clockMs: 1 }),
  ).toBeNull();
  expect(
    playedInterval(before, {
      ...before,
      positionMs: 1000,
      clockMs: 1000,
      active: false,
    }),
  ).toBeNull();
  expect(
    playedInterval(null, { ...before, positionMs: 1000, clockMs: 1000 }),
  ).toBeNull();
  expect(
    playedInterval(before, { ...before, positionMs: 1000, clockMs: 1000 }),
  ).toEqual([0, 1000]);
});
