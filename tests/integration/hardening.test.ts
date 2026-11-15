import { randomInt, randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { pool } from "../../lib/server/db";
import { requestOtp, verifyOtp } from "../../lib/server/auth";
import { requestIdentity } from "../../lib/server/identity";
import { reportProblem } from "../../lib/server/navigation";
afterAll(() => pool.end());
it("expected principal only rejects stale identities and never authenticates or selects a principal", async () => {
  const issued = await requestOtp(
    { phone: "+999" + randomInt(100000000, 999999999), purpose: "login" },
    randomUUID(),
  );
  const auth = await verifyOtp(
    { challengeId: issued.challengeId, code: "000000" },
    null,
  );
  const cookie = `shish_session=${auth.token}`;
  const actual = await requestIdentity(
    new Request("http://localhost", { headers: { cookie } }),
  );
  await expect(
    requestIdentity(
      new Request("http://localhost", {
        headers: { cookie, "x-expected-subject": randomUUID() },
      }),
    ),
  ).rejects.toMatchObject({ code: "SUBJECT_CHANGED", status: 409 });
  expect(
    await requestIdentity(
      new Request("http://localhost", {
        headers: { cookie, "x-expected-subject": actual.id },
      }),
    ),
  ).toEqual(actual);
  await expect(
    requestIdentity(
      new Request("http://localhost", {
        headers: { "x-expected-subject": actual.id },
      }),
    ),
  ).rejects.toMatchObject({ status: 401 });
});
it("rejects mismatched support context before any report write", async () => {
  const id = randomUUID();
  await pool.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [id]);
  const subject = { id, kind: "guest" as const };
  await expect(
    reportProblem(subject, {
      message: "test report",
      lessonId: "de-01",
      stageId: "de-02-0",
    }),
  ).rejects.toMatchObject({ code: "INVALID_REPORT" });
  expect(
    (
      await pool.query(
        "SELECT count(*) FROM support_reports WHERE subject_id=$1",
        [id],
      )
    ).rows[0].count,
  ).toBe("0");
});
