import { expect, it } from "vitest";
import {
  compare,
  decimal,
  effectiveExercise,
  fraction,
  lessonScore,
  maximum,
  numeric,
} from "../../lib/domain/learning/scoring";

it("LE-06/07/08/09 computes equal exercise weights and unique valid corrections", () => {
  const keys = ["1@1", "2@1", "3@1", "4@1", "5@1"];
  const baseline = effectiveExercise(keys, ["1@1", "2@1", "3@1"], []);
  const amended = effectiveExercise(
    keys,
    ["1@1", "2@1", "3@1"],
    ["4@1", "4@1", "1@1", "5@2"],
  );
  expect(numeric(baseline)).toBe(0.6);
  expect(numeric(amended)).toBe(0.8);
  expect(
    numeric(lessonScore(decimal("20"), true, [amended, fraction(1, 2)])),
  ).toBe(72);
  expect(numeric(effectiveExercise(keys, null, ["1@1"]))).toBe(0);
});
it("LE-10/15 compares unrounded exact fractions and never removes earned credit", () => {
  const third = fraction(1, 3);
  expect(compare(third, decimal("0.33333333333333333333"))).toBe(1);
  expect(compare(decimal("69.99"), decimal("70"))).toBe(-1);
  expect(compare(decimal("70"), decimal("70"))).toBe(0);
  expect(numeric(maximum(fraction(4, 5), fraction(3, 5)))).toBe(0.8);
  expect(
    numeric(lessonScore(decimal("20"), false, [fraction(1), fraction(1)])),
  ).toBe(80);
  expect(
    numeric(lessonScore(decimal("20"), true, [fraction(1), fraction(1)])),
  ).toBe(100);
  expect(() => lessonScore(decimal("20"), true, [])).toThrow();
  expect(() => lessonScore(decimal("101"), true, [fraction(1)])).toThrow();
});
