import { demoContentAllowed } from "../contracts/content";
import { ContentError } from "../server/content";

export interface SmsProvider {
  mode: "mock";
  challengeCode(): string;
  sendOtp(input: {
    phone: string;
    code: string;
    purpose: "login" | "recover";
  }): Promise<void>;
}
export function smsProvider(): SmsProvider {
  if (!demoContentAllowed() || process.env.SHISH_SMS_PROVIDER !== "mock")
    throw new ContentError("SMS_PROVIDER_UNAVAILABLE", 503);
  return {
    mode: "mock",
    challengeCode: () => "000000",
    async sendOtp() {
      if (process.env.SHISH_MOCK_SMS_FAILURE === "1")
        throw new ContentError("SMS_PROVIDER_UNAVAILABLE", 503);
      // No network message, outbox, console log or persisted plaintext code.
    },
  };
}
