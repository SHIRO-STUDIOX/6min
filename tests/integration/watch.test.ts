import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { startWatch, updateWatch } from "../../lib/server/watch";

afterAll(async () => {
  await pool.end();
});
async function subject() {
  const id = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  return { id, kind: "guest" as const };
}
const input = {
  lessonId: "de-01",
  revisionId: "de-01-v1",
  videoAssetId: "de-01-video",
};
async function elapsed(id: string) {
  // Explicit test clock fixture, not a learner API or a claim of actual playback.
  await pool.query(
    "UPDATE watch_sessions SET updated_at=now()-interval '10 seconds' WHERE id=$1",
    [id],
  );
}
it("persists 79.99/80 percent boundary, idempotent credit, replay and cross-session resume", async () => {
  const owner = await subject();
  const session = await startWatch(owner, input);
  await elapsed(session.watchSessionId);
  const below = await updateWatch(owner, session.watchSessionId, {
    sequence: 1,
    playedIntervals: [{ fromMs: 0, toMs: 7999 }],
    lastPositionMs: 7999,
  });
  expect(below.credited).toBe(false);
  await elapsed(session.watchSessionId);
  const credited = await updateWatch(owner, session.watchSessionId, {
    sequence: 2,
    playedIntervals: [{ fromMs: 7999, toMs: 8000 }],
    lastPositionMs: 8000,
  });
  expect(credited.credited).toBe(true);
  expect(credited.coverage).toBe(0.8);
  expect(
    (
      await updateWatch(owner, session.watchSessionId, {
        sequence: 2,
        playedIntervals: [],
        lastPositionMs: 0,
      })
    ).coverage,
  ).toBe(0.8);
  await elapsed(session.watchSessionId);
  expect(
    (
      await updateWatch(owner, session.watchSessionId, {
        sequence: 3,
        playedIntervals: [{ fromMs: 0, toMs: 5000 }],
        lastPositionMs: 5000,
      })
    ).coverage,
  ).toBe(0.8);
  const resumed = await startWatch(owner, input);
  expect(resumed.positionMs).toBe(5000);
  expect(resumed.coverage).toBe(0.8);
  expect(
    (
      await pool.query(
        "SELECT video_credited FROM lesson_progress WHERE subject_id=$1 AND lesson_id='de-01'",
        [owner.id],
      )
    ).rows[0].video_credited,
  ).toBe(true);
});
it("seek-only persists position without credit; rejects ownership, duration and sequence forgery", async () => {
  const owner = await subject();
  const session = await startWatch(owner, input);
  const seek = await updateWatch(owner, session.watchSessionId, {
    sequence: 1,
    playedIntervals: [],
    lastPositionMs: 10000,
  });
  expect(seek.coverage).toBe(0);
  expect(seek.credited).toBe(false);
  await expect(
    updateWatch(await subject(), session.watchSessionId, {
      sequence: 1,
      playedIntervals: [],
      lastPositionMs: 0,
    }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    updateWatch(owner, session.watchSessionId, {
      sequence: 3,
      playedIntervals: [],
      lastPositionMs: 0,
    }),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    updateWatch(owner, session.watchSessionId, {
      sequence: 2,
      playedIntervals: [{ fromMs: 0, toMs: 10001 }],
      lastPositionMs: 0,
    }),
  ).rejects.toMatchObject({ status: 422 });
});
it("rejects implausibly fast reported playback and stale asset versions", async () => {
  const owner = await subject();
  const session = await startWatch(owner, input);
  await expect(
    updateWatch(owner, session.watchSessionId, {
      sequence: 1,
      playedIntervals: [{ fromMs: 0, toMs: 10000 }],
      lastPositionMs: 10000,
    }),
  ).rejects.toMatchObject({ code: "IMPLAUSIBLE_PLAYBACK" });
  await expect(
    startWatch(owner, { ...input, videoAssetId: "forged" }),
  ).rejects.toMatchObject({ status: 409 });
});
