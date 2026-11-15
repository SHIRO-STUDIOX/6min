import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { demoContentAllowed } from "../contracts/content";
import { ContentError } from "../server/content";
export type PaymentInit = {
  purchaseId: string;
  amountMinor: number;
  currency: string;
  providerRef: string;
  payerReference: string;
};
const resultSchema = z
  .object({
    purchaseId: z.string().uuid(),
    providerRef: z.string().uuid(),
    externalPaymentId: z.string().uuid(),
    payerReference: z.string().uuid(),
    amountMinor: z.number().int().positive(),
    currency: z.literal("TEST"),
    status: z.enum(["verified", "failed", "cancelled"]),
  })
  .strict();
export type VerifiedPayment = z.infer<typeof resultSchema>;
export interface PaymentGateway {
  readonly provider: string;
  createRedirect(
    input: PaymentInit,
    origin: string,
  ): Promise<{ redirectUrl: string; providerRef: string }>;
  verifyExternalResult(
    payload: unknown,
    signature: string,
  ): Promise<VerifiedPayment>;
}
function secret() {
  if (
    !demoContentAllowed() ||
    process.env.SHISH_PAYMENT_PROVIDER !== "mock" ||
    !process.env.SHISH_MOCK_PAYMENT_SECRET ||
    process.env.SHISH_MOCK_PAYMENT_SECRET.length < 32
  )
    throw new ContentError("PAYMENT_PROVIDER_UNAVAILABLE", 503);
  return process.env.SHISH_MOCK_PAYMENT_SECRET;
}
export function signMockResult(result: VerifiedPayment) {
  return createHmac("sha256", secret())
    .update(JSON.stringify(resultSchema.parse(result)))
    .digest("hex");
}
class MockGateway implements PaymentGateway {
  readonly provider = "mock_TEST_ONLY";
  async createRedirect(input: PaymentInit, origin: string) {
    secret();
    return {
      providerRef: input.providerRef,
      redirectUrl: new URL(`/checkout/mock/${input.purchaseId}`, origin).href,
    };
  }
  async verifyExternalResult(payload: unknown, signature: string) {
    secret();
    const parsed = resultSchema.safeParse(payload);
    if (!parsed.success) throw new ContentError("INVALID_PAYMENT_EVENT", 422);
    const expected = signMockResult(parsed.data);
    if (
      !/^[a-f0-9]{64}$/.test(signature) ||
      !timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature, "hex"),
      )
    )
      throw new ContentError("PAYMENT_VERIFICATION_FAILED", 403);
    return parsed.data;
  }
}
export function paymentGateway(): PaymentGateway {
  secret();
  return new MockGateway();
}
export const demoProduct = {
  id: "shish-de-60",
  amountMinor: 1000,
  currency: "TEST",
  testOnly: true,
} as const;
