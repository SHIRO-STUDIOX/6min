import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { ContentError, catalog } from "./content";
import type { Subject } from "./identity";
import {
  demoProduct,
  paymentGateway,
  signMockResult,
  type VerifiedPayment,
} from "../integrations/payment";
const checkoutSchema = z
  .object({
    productId: z.literal("shish-de-60"),
    lessonId: z
      .string()
      .regex(/^de-(0[1-9]|[1-5][0-9]|60)$/)
      .optional(),
  })
  .strict();
const keySchema = z.string().uuid();
function userOnly(subject: Subject) {
  if (subject.kind !== "user")
    throw new ContentError("AUTHENTICATION_REQUIRED", 401);
}
export async function checkout(
  subject: Subject,
  input: unknown,
  key: string | null,
  origin: string,
) {
  userOnly(subject);
  const gateway = paymentGateway();
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success || !keySchema.safeParse(key).success)
    throw new ContentError("INVALID_CHECKOUT", 422);
  const body = parsed.data;
  const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${subject.id + ":" + key},0))`,
    );
    const existing = await tx.execute(
      sql`SELECT id,request_hash,provider_ref,amount_minor,currency FROM purchases WHERE user_id=${subject.id} AND idempotency_key=${key}`,
    );
    let row = existing.rows[0];
    if (row && row.request_hash !== hash)
      throw new ContentError("IDEMPOTENCY_CONFLICT", 409);
    if (!row) {
      const id = randomUUID();
      const providerRef = randomUUID();
      await tx.execute(
        sql`INSERT INTO purchases(id,user_id,product_id,amount_minor,currency,status,idempotency_key,provider,provider_ref,request_hash,return_lesson_id) VALUES(${id},${subject.id},${demoProduct.id},${demoProduct.amountMinor},${demoProduct.currency},'pending',${key},${gateway.provider},${providerRef},${hash},${body.lessonId ?? null})`,
      );
      row = {
        id,
        provider_ref: providerRef,
        amount_minor: demoProduct.amountMinor,
        currency: demoProduct.currency,
      };
    }
    const redirect = await gateway.createRedirect(
      {
        purchaseId: String(row.id),
        amountMinor: Number(row.amount_minor),
        currency: String(row.currency),
        providerRef: String(row.provider_ref),
        payerReference: subject.id,
      },
      origin,
    );
    const target = new URL(redirect.redirectUrl);
    if (
      target.origin !== origin ||
      target.pathname !== `/checkout/mock/${row.id}`
    )
      throw new ContentError("INVALID_GATEWAY_REDIRECT", 503);
    return { purchaseId: row.id, redirectUrl: target.href, testOnly: true };
  });
}
export async function purchaseStatus(subject: Subject, id: string) {
  userOnly(subject);
  if (!z.string().uuid().safeParse(id).success)
    throw new ContentError("NOT_FOUND", 404);
  const result = await db.execute(
    sql`SELECT id,product_id,status,amount_minor,currency,return_lesson_id,provider,expires_at FROM purchases WHERE id=${id} AND user_id=${subject.id}`,
  );
  const row = result.rows[0];
  if (!row) throw new ContentError("NOT_FOUND", 404);
  const lessons = await catalog(subject);
  const lesson = lessons.find((l) => l.id === row.return_lesson_id);
  const expired =
    row.status === "pending" &&
    new Date(String(row.expires_at)).getTime() <= Date.now();
  return {
    id: row.id,
    status: expired ? "expired" : row.status,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    testOnly: row.provider === "mock_TEST_ONLY",
    intendedLesson: lesson ?? null,
    continuePath: lesson?.access.canStart ? `/classroom/${lesson.id}` : "/path",
  };
}
export async function verifyPayment(payload: unknown, signature: string) {
  const gateway = paymentGateway();
  const verified = await gateway.verifyExternalResult(payload, signature);
  return db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT * FROM purchases WHERE id=${verified.purchaseId} FOR UPDATE`,
    );
    const row = result.rows[0];
    if (
      !row ||
      row.provider !== gateway.provider ||
      row.provider_ref !== verified.providerRef ||
      row.user_id !== verified.payerReference ||
      Number(row.amount_minor) !== verified.amountMinor ||
      row.currency !== verified.currency
    )
      throw new ContentError("PAYMENT_MISMATCH", 422);
    const duplicate = await tx.execute(
      sql`SELECT purchase_id,status FROM payment_transactions WHERE provider=${gateway.provider} AND provider_payment_id=${verified.externalPaymentId}`,
    );
    if (duplicate.rows[0]) {
      if (
        duplicate.rows[0].purchase_id !== row.id ||
        duplicate.rows[0].status !== verified.status
      )
        throw new ContentError("PAYMENT_REPLAY_CONFLICT", 409);
      return { accepted: true, status: row.status };
    }
    // A later conflicting notification is retained for reconciliation; success is never revoked automatically.
    await tx.execute(
      sql`INSERT INTO payment_transactions(id,purchase_id,provider,provider_payment_id,status,verified_at,safe_metadata) VALUES(${randomUUID()},${verified.purchaseId},${gateway.provider},${verified.externalPaymentId},${verified.status},now(),${JSON.stringify({ amountMinor: verified.amountMinor, currency: verified.currency })}::jsonb)`,
    );
    await tx.execute(
      sql`INSERT INTO payment_events(id,purchase_id,outcome) VALUES(${randomUUID()},${verified.purchaseId},${verified.status})`,
    );
    if (row.status !== "verified") {
      await tx.execute(
        sql`UPDATE purchases SET status=${verified.status} WHERE id=${verified.purchaseId}`,
      );
      if (verified.status === "verified")
        await tx.execute(
          sql`INSERT INTO entitlements(id,user_id,product_id,source_purchase_id) VALUES(${randomUUID()},${verified.payerReference},${row.product_id as string},${verified.purchaseId}) ON CONFLICT(user_id,product_id) WHERE revoked_at IS NULL DO NOTHING`,
        );
    }
    return {
      accepted: true,
      status: row.status === "verified" ? "verified" : verified.status,
    };
  });
}
export async function settleMock(subject: Subject, id: string, input: unknown) {
  userOnly(subject);
  paymentGateway();
  await purchaseStatus(subject, id);
  const body = z
    .object({ status: z.enum(["verified", "failed", "cancelled"]) })
    .strict()
    .safeParse(input);
  if (!body.success) throw new ContentError("INVALID_PAYMENT_EVENT", 422);
  const result = await db.execute(
    sql`SELECT * FROM purchases WHERE id=${id} AND user_id=${subject.id}`,
  );
  const row = result.rows[0];
  const event: VerifiedPayment = {
    purchaseId: id,
    providerRef: String(row.provider_ref),
    externalPaymentId: String(row.provider_ref),
    payerReference: subject.id,
    amountMinor: Number(row.amount_minor),
    currency: "TEST",
    status: body.data.status,
  };
  return verifyPayment(event, signMockResult(event));
}
