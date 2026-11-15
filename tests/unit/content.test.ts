import { afterEach, expect, it, vi } from "vitest";
import {
  demoContentAllowed,
  publicQuestionSchema,
} from "../../lib/contracts/content";

afterEach(() => vi.unstubAllEnvs());
it("rejects private answer fields in public payloads", () => {
  expect(() =>
    publicQuestionSchema.parse({
      prompt: "Hallo",
      options: [{ id: "a", text: "سلام" }],
      answerKey: "a",
    }),
  ).toThrow();
});
it.each(["production", "", "unknown"])(
  "fails closed for demo content in %s",
  (environment) => {
    vi.stubEnv("SHISH_ENV", environment);
    vi.stubEnv("SHISH_DEMO_MODE", "1");
    expect(demoContentAllowed()).toBe(false);
  },
);
it("requires both development environment and explicit demo opt-in", () => {
  vi.stubEnv("SHISH_ENV", "development");
  vi.stubEnv("SHISH_DEMO_MODE", "0");
  expect(demoContentAllowed()).toBe(false);
  vi.stubEnv("SHISH_DEMO_MODE", "1");
  expect(demoContentAllowed()).toBe(true);
});
