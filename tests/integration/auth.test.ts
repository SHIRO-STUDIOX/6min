import { randomInt, randomUUID } from "node:crypto";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { pool } from "../../lib/server/db";
import {
  requestOtp,
  verifyOtp,
  passwordLogin,
  setPassword,
  recoverPassword,
} from "../../lib/server/auth";
import { authenticatedSession } from "../../lib/server/sessions";
import { requestIdentity } from "../../lib/server/identity";

afterAll(async () => {
  await pool.end();
});
afterEach(() => vi.unstubAllEnvs());
const phone = () => "+999" + randomInt(100000000, 999999999);
const request = (token: string) =>
  new Request("http://localhost/", {
    headers: { cookie: `shish_session=${token}` },
  });
async function signup(number = phone()) {
  const challenge = await requestOtp(
    { phone: number, purpose: "login" },
    randomUUID(),
  );
  const result = await verifyOtp(
    { challengeId: challenge.challengeId, code: "000000" },
    null,
  );
  return {
    number,
    result,
    session: await authenticatedSession(request(result.token!)),
  };
}
it("OTP has generic response, hashed storage, cooldown, expiry and one-time use", async () => {
  const number = phone();
  const challenge = await requestOtp(
    { phone: number, purpose: "login" },
    randomUUID(),
  );
  expect(Object.keys(challenge).sort()).toEqual([
    "challengeId",
    "expiresIn",
    "mode",
    "resendAfter",
  ]);
  const stored = await pool.query(
    "SELECT length(code_hash) AS hash_length,attempts FROM auth_challenges WHERE id=$1",
    [challenge.challengeId],
  );
  expect(stored.rows[0]).toEqual({ hash_length: 64, attempts: 0 });
  await expect(
    requestOtp({ phone: number, purpose: "login" }, randomUUID()),
  ).rejects.toMatchObject({ status: 429 });
  await expect(
    verifyOtp({ challengeId: challenge.challengeId, code: "111111" }, null),
  ).rejects.toMatchObject({ status: 401 });
  expect(
    (
      await pool.query("SELECT attempts FROM auth_challenges WHERE id=$1", [
        challenge.challengeId,
      ])
    ).rows[0].attempts,
  ).toBe(1);
  const valid = await verifyOtp(
    { challengeId: challenge.challengeId, code: "000000" },
    null,
  );
  expect(valid.newAccount).toBe(true);
  await expect(
    verifyOtp({ challengeId: challenge.challengeId, code: "000000" }, null),
  ).rejects.toMatchObject({ status: 401 });
  const expired = await requestOtp(
    { phone: phone(), purpose: "login" },
    randomUUID(),
  );
  await pool.query(
    "UPDATE auth_challenges SET expires_at=now()-interval '1 second' WHERE id=$1",
    [expired.challengeId],
  );
  await expect(
    verifyOtp({ challengeId: expired.challengeId, code: "000000" }, null),
  ).rejects.toMatchObject({ status: 401 });
});
it("locks a challenge after five wrong codes with no account creation", async () => {
  const number = phone();
  const challenge = await requestOtp(
    { phone: number, purpose: "login" },
    randomUUID(),
  );
  for (let index = 0; index < 5; index++)
    await expect(
      verifyOtp({ challengeId: challenge.challengeId, code: "111111" }, null),
    ).rejects.toMatchObject({ status: 401 });
  await expect(
    verifyOtp({ challengeId: challenge.challengeId, code: "000000" }, null),
  ).rejects.toMatchObject({ status: 401 });
  expect(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM users WHERE phone=$1",
        [number],
      )
    ).rows[0].count,
  ).toBe(0);
});
it("password login/recovery changes credentials, revokes sessions and consumes the recovery grant", async () => {
  const { number, result, session } = await signup();
  await setPassword(session.subject.id, session.hash, true, {
    password: "old-development-password",
  });
  await expect(
    passwordLogin({ phone: number, password: "wrong" }),
  ).rejects.toMatchObject({ status: 401 });
  const passwordSession = await passwordLogin({
    phone: number,
    password: "old-development-password",
  });
  expect(
    (await authenticatedSession(request(passwordSession))).newAccount,
  ).toBe(false);
  const challenge = await requestOtp(
    { phone: number, purpose: "recover" },
    randomUUID(),
  );
  const recovery = await verifyOtp(
    { challengeId: challenge.challengeId, code: "000000" },
    null,
  );
  expect(recovery.token).toBeNull();
  const payload = {
    recoveryGrant: recovery.recoveryGrant,
    newPassword: "new-development-password",
  };
  const resetSession = await recoverPassword(payload);
  expect((await authenticatedSession(request(resetSession!))).subject.id).toBe(
    session.subject.id,
  );
  await expect(
    authenticatedSession(request(result.token!)),
  ).rejects.toMatchObject({ status: 401 });
  await expect(
    authenticatedSession(request(passwordSession)),
  ).rejects.toMatchObject({ status: 401 });
  await expect(
    passwordLogin({ phone: number, password: "old-development-password" }),
  ).rejects.toMatchObject({ status: 401 });
  expect(
    (
      await authenticatedSession(
        request(
          await passwordLogin({
            phone: number,
            password: "new-development-password",
          }),
        ),
      )
    ).subject.id,
  ).toBe(session.subject.id);
  await expect(recoverPassword(payload)).rejects.toMatchObject({ status: 401 });
});
it("does not silently use guest identity on expired account session or accept mock users in Production", async () => {
  const { result } = await signup();
  vi.stubEnv("SHISH_ENV", "production");
  await expect(
    authenticatedSession(request(result.token!)),
  ).rejects.toMatchObject({ status: 401 });
  vi.unstubAllEnvs();
  await pool.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
    [(await authenticatedSession(request(result.token!))).subject.id],
  );
  await expect(requestIdentity(request(result.token!))).rejects.toMatchObject({
    status: 401,
  });
});
