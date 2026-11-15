import { expect, it } from "vitest";
import { safeReturn } from "../../lib/domain/navigation";
it("preserves bounded internal intent and rejects script, foreign, backslash and control targets", () => {
  for (const path of [
    "javascript:alert(1)",
    "//evil.test/path",
    "https://evil.test",
    "/\\evil.test/path",
    "/path\nX",
    "/api/v1/me",
    "/path" + "x".repeat(1200),
  ])
    expect(safeReturn(path, "/")).toBe("/");
  for (const path of [
    "/classroom/de-01?stage=de-01-1",
    "/checkout/return?purchase=1",
    "/path",
  ])
    expect(safeReturn(path)).toBe(path);
});
