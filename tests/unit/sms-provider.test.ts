import { afterEach, expect, it, vi } from "vitest";
import { smsProvider } from "../../lib/integrations/sms";

afterEach(() => vi.unstubAllEnvs());
it("never exposes a mock provider in Production even with a mock flag", () => {
  vi.stubEnv("SHISH_ENV", "production");
  vi.stubEnv("SHISH_SMS_PROVIDER", "mock");
  vi.stubEnv("SHISH_DEMO_MODE", "1");
  expect(() => smsProvider()).toThrow("SMS_PROVIDER_UNAVAILABLE");
});
it("keeps demo sending network-free and can surface a provider outage", async () => {
  vi.stubEnv("SHISH_ENV", "test");
  vi.stubEnv("SHISH_SMS_PROVIDER", "mock");
  vi.stubEnv("SHISH_DEMO_MODE", "1");
  const provider = smsProvider();
  expect(provider.mode).toBe("mock");
  await expect(
    provider.sendOtp({
      phone: "+999123456789",
      code: "000000",
      purpose: "login",
    }),
  ).resolves.toBeUndefined();
  vi.stubEnv("SHISH_MOCK_SMS_FAILURE", "1");
  await expect(
    provider.sendOtp({
      phone: "+999123456789",
      code: "000000",
      purpose: "login",
    }),
  ).rejects.toMatchObject({ status: 503 });
});
