export type WatchRange = [number, number];
export function unionRanges(
  ranges: WatchRange[],
  durationMs: number,
): WatchRange[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0)
    throw new RangeError("Invalid duration");
  const sorted = ranges
    .map(([from, to]): WatchRange => {
      if (![from, to].every(Number.isFinite) || to < from)
        throw new RangeError("Invalid watch interval");
      return [
        Math.max(0, Math.min(durationMs, from)),
        Math.max(0, Math.min(durationMs, to)),
      ];
    })
    .filter(([from, to]) => to > from)
    .sort((a, b) => a[0] - b[0]);
  const merged: WatchRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}
export function watchedMs(ranges: WatchRange[]): number {
  return ranges.reduce((sum, [from, to]) => sum + to - from, 0);
}
export function hasVideoCredit(
  ranges: WatchRange[],
  durationMs: number,
): boolean {
  return watchedMs(unionRanges(ranges, durationMs)) * 5 >= durationMs * 4;
}
export type PlaybackPoint = {
  positionMs: number;
  clockMs: number;
  rate: number;
  active: boolean;
};
/** Media movement must agree with elapsed monotonic wall time; seeks create no interval. */
export function playedInterval(
  previous: PlaybackPoint | null,
  current: PlaybackPoint,
): WatchRange | null {
  if (!previous?.active || !current.active) return null;
  const mediaDelta = current.positionMs - previous.positionMs;
  const wallDelta = current.clockMs - previous.clockMs;
  if (
    wallDelta <= 0 ||
    mediaDelta <= 0 ||
    current.rate <= 0 ||
    current.rate > 2 ||
    mediaDelta > wallDelta * current.rate + 150
  )
    return null;
  return [previous.positionMs, current.positionMs];
}
