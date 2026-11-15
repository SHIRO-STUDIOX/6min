import { expect, it } from "vitest";
import { normalizePhone } from "../../lib/domain/identity/phone";
import { passwordHash, passwordMatches } from "../../lib/server/passwords";

it("normalizes Unicode Iranian prototype and international E.164 inputs without inventing countries", () => {
  expect(normalizePhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe("+989123456789");
  expect(normalizePhone("00989123456789")).toBe("+989123456789");
  expect(normalizePhone("+49 (123) 456789")).toBe("+49123456789");
  expect(() => normalizePhone("not-a-phone")).toThrow();
});
it("uses salted scrypt and constant-time missing/wrong credential work", async () => {
  const password = "development-only-test-password";
  const first = await passwordHash(password);
  const second = await passwordHash(password);
  expect(first).not.toBe(second);
  expect(first).not.toContain(password);
  expect(await passwordMatches(password, first)).toBe(true);
  expect(await passwordMatches("incorrect", first)).toBe(false);
  expect(await passwordMatches(password, null)).toBe(false);
  await expect(passwordHash("short")).rejects.toThrow("INVALID_PASSWORD");
});
