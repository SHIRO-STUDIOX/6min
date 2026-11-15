import { randomInt, randomUUID } from "node:crypto";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { pool } from "../../lib/server/db";
import {
  checkout,
  purchaseStatus,
  verifyPayment,
  settleMock,
} from "../../lib/server/commerce";
import {
  demoProduct,
  signMockResult,
  type VerifiedPayment,
} from "../../lib/integrations/payment";
import { commercialAllowed } from "../../lib/server/access";
import { lessonPublic } from "../../lib/server/content";
import type { Subject } from "../../lib/server/identity";
afterAll(() => pool.end());
afterEach(() => vi.unstubAllEnvs());
async function user(): Promise<Subject> {
  const id = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'user')", [id]);
  await pool.query(
    "INSERT INTO users(id,phone,auth_mode,phone_verified_at) VALUES($1,$2,'mock',now())",
    [id, "+999" + randomInt(100000000, 999999999)],
  );
  return { id, kind: "user" };
}
async function order(subject: Subject, key = randomUUID()) {
  return checkout(
    subject,
    { productId: demoProduct.id, lessonId: "de-04" },
    key,
    "http://localhost",
  );
}
async function event(subject: Subject, id: string): Promise<VerifiedPayment> {
  const { rows } = await pool.query(
    "SELECT provider_ref FROM purchases WHERE id=$1",
    [id],
  );
  return {
    purchaseId: id,
    providerRef: String(rows[0].provider_ref),
    externalPaymentId: randomUUID(),
    payerReference: subject.id,
    amountMinor: demoProduct.amountMinor,
    currency: "TEST",
    status: "verified",
  };
}
it("checkout concurrent retry is idempotent, forbids client price, requires account and owner reads", async () => {
  const subject = await user(),
    other = await user(),
    key = randomUUID();
  const results = await Promise.all([order(subject, key), order(subject, key)]);
  expect(results[0].purchaseId).toBe(results[1].purchaseId);
  await expect(
    checkout(
      subject,
      { productId: demoProduct.id, lessonId: "de-05" },
      key,
      "http://localhost",
    ),
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    checkout(
      subject,
      { productId: demoProduct.id, amountMinor: 1 },
      randomUUID(),
      "http://localhost",
    ),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    checkout(
      { id: randomUUID(), kind: "guest" },
      { productId: demoProduct.id },
      randomUUID(),
      "http://localhost",
    ),
  ).rejects.toMatchObject({ status: 401 });
  await expect(
    purchaseStatus(other, String(results[0].purchaseId)),
  ).rejects.toMatchObject({ status: 404 });
  expect(await commercialAllowed(subject, 4)).toBe(false);
});
it("signed delayed callback grants once atomically; payment does not publish or unlock pedagogy", async () => {
  const subject = await user(),
    created = await order(subject),
    id = String(created.purchaseId);
  expect((await purchaseStatus(subject, id)).status).toBe("pending");
  const payload = await event(subject, id),
    sig = signMockResult(payload);
  await Promise.all([verifyPayment(payload, sig), verifyPayment(payload, sig)]);
  expect((await purchaseStatus(subject, id)).status).toBe("verified");
  expect(await commercialAllowed(subject, 60)).toBe(true);
  expect(
    Number(
      (
        await pool.query("SELECT count(*) FROM entitlements WHERE user_id=$1", [
          subject.id,
        ])
      ).rows[0].count,
    ),
  ).toBe(1);
  expect(
    Number(
      (
        await pool.query(
          "SELECT count(*) FROM payment_transactions WHERE purchase_id=$1",
          [id],
        )
      ).rows[0].count,
    ),
  ).toBe(1);
  await expect(lessonPublic("de-02", subject)).rejects.toMatchObject({
    code: "PREREQUISITE_REQUIRED",
  });
  await expect(lessonPublic("de-04", subject)).rejects.toMatchObject({
    code: "CONTENT_UNAVAILABLE",
  });
  const late = {
    ...payload,
    externalPaymentId: randomUUID(),
    status: "failed" as const,
  };
  await verifyPayment(late, signMockResult(late));
  expect((await purchaseStatus(subject, id)).status).toBe("verified");
});
it("wrong signature, owner, amount/ref and reused provider transaction cannot grant", async () => {
  const subject = await user(),
    created = await order(subject),
    id = String(created.purchaseId),
    payload = await event(subject, id);
  await expect(verifyPayment(payload, "0".repeat(64))).rejects.toMatchObject({
    status: 403,
  });
  for (const bad of [
    { ...payload, payerReference: randomUUID() },
    { ...payload, amountMinor: 1 },
    { ...payload, providerRef: randomUUID() },
  ])
    await expect(verifyPayment(bad, signMockResult(bad))).rejects.toMatchObject(
      { status: 422 },
    );
  expect(await commercialAllowed(subject, 4)).toBe(false);
  await verifyPayment(payload, signMockResult(payload));
  const next = await order(subject);
  const replay = {
    ...(await event(subject, String(next.purchaseId))),
    externalPaymentId: payload.externalPaymentId,
  };
  await expect(
    verifyPayment(replay, signMockResult(replay)),
  ).rejects.toMatchObject({ status: 409 });
});
it("cancel and failure preserve learning; late verified reconciliation and retry keep a unique entitlement", async () => {
  const subject = await user();
  await pool.query(
    "INSERT INTO lesson_progress(subject_id,lesson_id,video_credited) VALUES($1,'de-01',true)",
    [subject.id],
  );
  for (const status of ["cancelled", "failed"] as const) {
    const created = await order(subject);
    await settleMock(subject, String(created.purchaseId), { status });
    expect(await commercialAllowed(subject, 4)).toBe(false);
  }
  expect(
    (
      await pool.query(
        "SELECT video_credited FROM lesson_progress WHERE subject_id=$1",
        [subject.id],
      )
    ).rows[0].video_credited,
  ).toBe(true);
  const pending = await order(subject),
    id = String(pending.purchaseId);
  await pool.query(
    "UPDATE purchases SET expires_at=now()-interval '1 minute' WHERE id=$1",
    [id],
  );
  expect((await purchaseStatus(subject, id)).status).toBe("expired");
  const payload = await event(subject, id);
  await verifyPayment(payload, signMockResult(payload));
  const retry = await order(subject),
    again = await event(subject, String(retry.purchaseId));
  await verifyPayment(again, signMockResult(again));
  expect(
    Number(
      (
        await pool.query("SELECT count(*) FROM entitlements WHERE user_id=$1", [
          subject.id,
        ])
      ).rows[0].count,
    ),
  ).toBe(1);
});
it("mock commerce fails closed in production even when flags/secrets are set", async () => {
  const subject = await user();
  vi.stubEnv("SHISH_ENV", "production");
  await expect(order(subject)).rejects.toMatchObject({ status: 503 });
});
