export type Fraction = { n: bigint; d: bigint };
const zero = BigInt(0);
const one = BigInt(1);
export function fraction(
  n: bigint | number | string,
  d: bigint | number | string = one,
): Fraction {
  let numerator = BigInt(n);
  let denominator = BigInt(d);
  if (denominator <= zero || numerator < zero)
    throw new RangeError("Invalid nonnegative fraction");
  let a = numerator;
  let b = denominator;
  while (b !== zero) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  if (a !== zero) {
    numerator /= a;
    denominator /= a;
  }
  return { n: numerator, d: denominator };
}
export function decimal(value: string): Fraction {
  if (!/^\d+(\.\d+)?$/.test(value))
    throw new RangeError("Invalid decimal policy");
  const [whole, tail = ""] = value.split(".");
  return fraction(whole + tail, BigInt("1" + "0".repeat(tail.length)));
}
export const compare = (a: Fraction, b: Fraction) =>
  a.n * b.d < b.n * a.d ? -1 : a.n * b.d > b.n * a.d ? 1 : 0;
export const add = (a: Fraction, b: Fraction) =>
  fraction(a.n * b.d + b.n * a.d, a.d * b.d);
export const multiply = (a: Fraction, b: Fraction) =>
  fraction(a.n * b.n, a.d * b.d);
export const maximum = (a: Fraction, b: Fraction) =>
  compare(a, b) >= 0 ? a : b;
export const numeric = (value: Fraction) => Number(value.n) / Number(value.d);
export function effectiveExercise(
  allKeys: string[],
  baselineCorrect: string[] | null,
  laterCorrections: string[],
): Fraction {
  if (baselineCorrect === null) return fraction(0);
  if (!allKeys.length || new Set(allKeys).size !== allKeys.length)
    throw new RangeError("Invalid question snapshot");
  const valid = new Set(allKeys);
  const corrected = new Set(
    [...baselineCorrect, ...laterCorrections].filter((key) => valid.has(key)),
  );
  return fraction(corrected.size, allKeys.length);
}
export function lessonScore(
  videoWeight: Fraction,
  videoCredited: boolean,
  exercises: Fraction[],
): Fraction {
  const hundred = fraction(100);
  if (
    !exercises.length ||
    compare(videoWeight, hundred) > 0 ||
    exercises.some((value) => compare(value, fraction(1)) > 0)
  )
    throw new RangeError("Invalid scoring policy");
  const exerciseWeight = fraction(
    hundred.n * videoWeight.d - videoWeight.n * hundred.d,
    hundred.d * videoWeight.d * BigInt(exercises.length),
  );
  return exercises.reduce(
    (score, value) => add(score, multiply(exerciseWeight, value)),
    videoCredited ? videoWeight : fraction(0),
  );
}
