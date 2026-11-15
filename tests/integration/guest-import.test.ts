import { randomInt, randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { requestOtp, verifyOtp } from "../../lib/server/auth";
import { authenticatedSession } from "../../lib/server/sessions";
import { submitAttempt } from "../../lib/server/attempts";
import { startWatch, updateWatch } from "../../lib/server/watch";
import { importGuest, importPreview } from "../../lib/server/guest-import";

afterAll(async () => {
  await pool.end();
});
const matching = (correct = false) => ({
  lessonId: "de-01",
  revisionId: "de-01-v1",
  stageId: "de-01-1",
  kind: "full",
  completed: true,
  answers: [0, 1].map((index) => ({
    questionId: `de-01-1-q${index}`,
    revision: 1,
    response: { choiceId: correct ? `option-${index}` : "wrong" },
  })),
});
async function guestHistory() {
  const id = randomUUID();
  const subject = { id, kind: "guest" as const };
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  const session = await startWatch(subject, {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    videoAssetId: "de-01-video",
  });
  // Test-only clock fixture; actual media playback is covered by browser tests.
  await pool.query(
    "UPDATE watch_sessions SET updated_at=now()-interval '10 seconds' WHERE id=$1",
    [session.watchSessionId],
  );
  await updateWatch(subject, session.watchSessionId, {
    sequence: 1,
    playedIntervals: [{ fromMs: 0, toMs: 10000 }],
    lastPositionMs: 10000,
  });
  await submitAttempt(subject, matching(), randomUUID());
  await submitAttempt(
    subject,
    {
      ...matching(),
      stageId: "de-01-2",
      answers: [0, 1].map((index) => ({
        questionId: `de-01-2-q${index}`,
        revision: 1,
        response: { tokenIds: ["token-0", "token-1"] },
      })),
    },
    randomUUID(),
  );
  await submitAttempt(
    subject,
    {
      ...matching(),
      kind: "review",
      answers: [
        {
          questionId: "de-01-1-q0",
          revision: 1,
          response: { choiceId: "option-0" },
        },
      ],
    },
    randomUUID(),
  );
  return subject;
}
async function account(guestId: string | null) {
  const phone = "+999" + randomInt(100000000, 999999999);
  const challenge = await requestOtp({ phone, purpose: "login" }, randomUUID());
  const login = await verifyOtp(
    { challengeId: challenge.challengeId, code: "000000" },
    guestId,
  );
  return authenticatedSession(
    new Request("http://localhost/", {
      headers: { Cookie: `shish_session=${login.token}` },
    }),
  );
}
const body = (guestId: string) => ({
  guestBatchId: randomUUID(),
  mergeConsent: false,
  drafts: [
    {
      scope: guestId,
      lessonId: "de-01",
      revisionId: "de-01-v1",
      stageId: "de-01-1",
      input: "Hallo",
      version: 1,
      updatedAt: new Date().toISOString(),
    },
  ],
});

it("retains previously earned guest progress when a later baseline excludes old corrections", async () => {
  const guest = await guestHistory();
  await submitAttempt(
    guest,
    {
      ...matching(),
      kind: "review",
      answers: [
        {
          questionId: "de-01-1-q1",
          revision: 1,
          response: { choiceId: "option-1" },
        },
      ],
    },
    randomUUID(),
  );
  await submitAttempt(
    guest,
    {
      ...matching(),
      answers: [
        {
          questionId: "de-01-1-q0",
          revision: 1,
          response: { choiceId: "wrong" },
        },
        {
          questionId: "de-01-1-q1",
          revision: 1,
          response: { choiceId: "option-1" },
        },
      ],
    },
    randomUUID(),
  );
  const accountSession = await account(guest.id);
  await importGuest(accountSession.subject.id, guest.id, body(guest.id), true);
  const progress = await pool.query(
    "SELECT effective_score::float,current_score::float FROM lesson_progress WHERE subject_id=$1 AND lesson_id='de-01'",
    [accountSession.subject.id],
  );
  expect(progress.rows[0]).toEqual({ effective_score: 100, current_score: 80 });
});

it("AU-04 automatically imports a new-account source once under concurrent/repeated batches", async () => {
  const guest = await guestHistory();
  const session = await account(guest.id);
  const auto =
    session.newAccount && session.sourceGuestId === guest.id && session.recent;
  expect(auto).toBe(true);
  expect(
    (await importPreview(session.subject.id, guest.id, auto)).attemptCount,
  ).toBe(3);
  const input = body(guest.id);
  const results = await Promise.all([
    importGuest(session.subject.id, guest.id, input, auto),
    importGuest(session.subject.id, guest.id, input, auto),
  ]);
  expect(results[0]).toEqual(results[1]);
  expect(results[0].importedAttempts).toBe(3);
  expect(
    (
      await pool.query(
        "SELECT effective_score::float FROM lesson_progress WHERE subject_id=$1 AND lesson_id='de-01'",
        [session.subject.id],
      )
    ).rows[0].effective_score,
  ).toBe(80);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1",
        [guest.id],
      )
    ).rows[0].count,
  ).toBe(3);
  const another = await importGuest(
    session.subject.id,
    guest.id,
    { ...input, guestBatchId: randomUUID() },
    auto,
  );
  expect(another.importedAttempts).toBe(0);
  expect(another.importedWatchSessions).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM entitlements WHERE user_id=$1",
        [session.subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
  await expect(
    importGuest(
      session.subject.id,
      guest.id,
      { ...input, drafts: [{ ...input.drafts[0], input: "changed" }] },
      auto,
    ),
  ).rejects.toMatchObject({ status: 409 });
});
it("AU-05/06 requires consent for an existing account and never overwrites its history or conflicting draft", async () => {
  const guest = await guestHistory();
  const session = await account(null);
  await pool.query(
    "INSERT INTO lesson_progress(subject_id,lesson_id,video_credited,unlocked_at) VALUES($1,'de-01',true,now())",
    [session.subject.id],
  );
  const original = await submitAttempt(
    session.subject,
    matching(true),
    randomUUID(),
  );
  await pool.query(
    "INSERT INTO drafts(subject_id,stage_id,local_version,input) VALUES($1,'de-01-1',3,'\"existing account draft\"')",
    [session.subject.id],
  );
  const input = body(guest.id);
  await expect(
    importGuest(session.subject.id, guest.id, input, false),
  ).rejects.toMatchObject({ code: "IMPORT_CONSENT_REQUIRED" });
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1",
        [session.subject.id],
      )
    ).rows[0].count,
  ).toBe(1);
  const imported = await importGuest(
    session.subject.id,
    guest.id,
    { ...input, mergeConsent: true },
    false,
  );
  expect(imported.draftConflicts).toBe(1);
  expect(
    (
      await pool.query(
        "SELECT input FROM drafts WHERE subject_id=$1 AND stage_id='de-01-1'",
        [session.subject.id],
      )
    ).rows[0].input,
  ).toBe("existing account draft");
  expect(
    (
      await pool.query("SELECT id FROM learning_attempts WHERE id=$1", [
        original.attemptId,
      ])
    ).rowCount,
  ).toBe(1);
  expect(
    (
      await pool.query(
        "SELECT effective_score::float FROM lesson_progress WHERE subject_id=$1 AND lesson_id='de-01'",
        [session.subject.id],
      )
    ).rows[0].effective_score,
  ).toBe(100);
});
it("failed late import rolls back all target changes, preserves guest source, then retries safely", async () => {
  const guest = await guestHistory();
  const session = await account(guest.id);
  const input = body(guest.id);
  const invalid = {
    ...input,
    drafts: [{ ...input.drafts[0], lessonId: "de-04" }],
  };
  await expect(
    importGuest(session.subject.id, guest.id, invalid, true),
  ).rejects.toMatchObject({ status: 422 });
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1",
        [session.subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM guest_imports WHERE target_user_id=$1",
        [session.subject.id],
      )
    ).rows[0].count,
  ).toBe(0);
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM learning_attempts WHERE subject_id=$1",
        [guest.id],
      )
    ).rows[0].count,
  ).toBe(3);
  expect(
    (await importGuest(session.subject.id, guest.id, input, true)).acknowledged,
  ).toBe(true);
});
