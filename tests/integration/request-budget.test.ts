import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { rateLimit } from "../../lib/server/request-security";
import { pool } from "../../lib/server/db";

afterAll(async () => { await pool.end(); });
it("atomically bounds parallel mutations across clients sharing a budget", async () => {
  const outcomes = await Promise.allSettled(Array.from({ length: 5 }, () => rateLimit("test:" + scope, 3)));
  expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(3);
  expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(2);
});
const scope = randomUUID();
