import { randomUUID, randomBytes, timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { ContentError } from "./content";
import { rateLimit } from "./request-security";
import { issueSession, tokenHash } from "./sessions";
import { passwordHash, passwordMatches } from "./passwords";
import { smsProvider } from "../integrations/sms";
import { demoContentAllowed } from "../contracts/content";
import { normalizePhone } from "../domain/identity/phone";

const phoneSchema = z
  .string()
  .max(32)
  .transform((phone, ctx) => {
    try {
      return normalizePhone(phone);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid phone" });
      return z.NEVER;
    }
  });
const requestSchema = z
  .object({ phone: phoneSchema, purpose: z.enum(["login", "recover"]) })
  .strict();
export async function requestOtp(input: unknown, device: string) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_AUTH_REQUEST", 422);
  const { phone, purpose } = parsed.data;
  const provider = smsProvider();
  await rateLimit("otp-global", 100);
  await rateLimit(`otp-phone:${tokenHash(phone)}:${purpose}`, 3);
  await rateLimit(`otp-device:${device}`, 10);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${phone + purpose},0))`,
    );
    const recent = await tx.execute(
      sql`SELECT 1 FROM auth_challenges WHERE phone=${phone} AND purpose=${purpose} AND resend_after>now() LIMIT 1`,
    );
    if (recent.rows.length) throw new ContentError("RESEND_COOLDOWN", 429);
    const id = randomUUID();
    const code = provider.challengeCode();
    await provider.sendOtp({ phone, code, purpose });
    await tx.execute(
      sql`INSERT INTO auth_challenges(id,phone,purpose,code_hash,expires_at,resend_after) VALUES (${id},${phone},${purpose},${tokenHash(id + ":" + code)},now()+interval '5 minutes',now()+interval '60 seconds')`,
    );
    return {
      challengeId: id,
      expiresIn: 300,
      resendAfter: 60,
      mode: provider.mode,
    };
  });
}

const verifySchema = z
  .object({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) })
  .strict();
export async function verifyOtp(input: unknown, guestId: string | null) {
  smsProvider();
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) throw new ContentError("AUTHENTICATION_FAILED", 401);
  await rateLimit(`otp-verify:${parsed.data.challengeId}`, 8);
  const result = await db.transaction(async (tx) => {
    const rows = await tx.execute(
      sql`SELECT * FROM auth_challenges WHERE id=${parsed.data.challengeId} FOR UPDATE`,
    );
    const challenge = rows.rows[0];
    if (
      !challenge ||
      challenge.consumed_at ||
      Number(challenge.attempts) >= 5 ||
      new Date(challenge.expires_at as string).getTime() <= Date.now()
    )
      return null;
    await tx.execute(
      sql`UPDATE auth_challenges SET attempts=attempts+1 WHERE id=${parsed.data.challengeId}`,
    );
    if (
      !timingSafeEqual(
        Buffer.from(challenge.code_hash as string, "hex"),
        Buffer.from(
          tokenHash(parsed.data.challengeId + ":" + parsed.data.code),
          "hex",
        ),
      )
    )
      return null;
    await tx.execute(
      sql`UPDATE auth_challenges SET consumed_at=clock_timestamp() WHERE id=${parsed.data.challengeId}`,
    );
    if (challenge.purpose === "recover") {
      const grant = randomBytes(32).toString("hex");
      await tx.execute(
        sql`INSERT INTO recovery_grants(token_hash,phone,expires_at) VALUES (${tokenHash(grant)},${challenge.phone as string},now()+interval '5 minutes')`,
      );
      return { token: null, recoveryGrant: grant, newAccount: false };
    }
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${challenge.phone as string},0))`,
    );
    const existing = await tx.execute(
      sql`SELECT id FROM users WHERE phone=${challenge.phone as string}`,
    );
    const newAccount = !existing.rows.length;
    const userId = (existing.rows[0]?.id as string) ?? randomUUID();
    if (newAccount) {
      await tx.execute(
        sql`INSERT INTO subjects(id,kind) VALUES (${userId},'user')`,
      );
      await tx.execute(
        sql`INSERT INTO users(id,phone,phone_verified_at) VALUES (${userId},${challenge.phone as string},now())`,
      );
    }
    return {
      token: await issueSession(tx, userId, newAccount, guestId),
      recoveryGrant: null,
      newAccount,
    };
  });
  if (!result) throw new ContentError("AUTHENTICATION_FAILED", 401);
  return result;
}

const loginSchema = z
  .object({ phone: phoneSchema, password: z.string().min(1).max(128) })
  .strict();
export async function passwordLogin(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("AUTHENTICATION_FAILED", 401);
  await rateLimit("password-global", 100);
  await rateLimit(`password-phone:${tokenHash(parsed.data.phone)}`, 5);
  const rows = await db.execute(
    sql`SELECT id,password_hash FROM users WHERE phone=${parsed.data.phone} AND phone_verified_at IS NOT NULL AND (auth_mode='real' OR ${demoContentAllowed()})`,
  );
  const user = rows.rows[0];
  if (
    !(await passwordMatches(
      parsed.data.password,
      (user?.password_hash as string) ?? null,
    )) ||
    !user
  )
    throw new ContentError("AUTHENTICATION_FAILED", 401);
  return db.transaction((tx) => issueSession(tx, user.id as string));
}

const passwordSchema = z
  .object({ password: z.string().min(12).max(128) })
  .strict();
export async function setPassword(
  userId: string,
  keepSessionHash: string,
  recent: boolean,
  input: unknown,
) {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) throw new ContentError("INVALID_PASSWORD", 422);
  if (!recent) throw new ContentError("RECENT_AUTH_REQUIRED", 401);
  await rateLimit(`password-set:${userId}`, 5);
  const hash = await passwordHash(parsed.data.password);
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`UPDATE users SET password_hash=${hash} WHERE id=${userId}`,
    );
    await tx.execute(
      sql`UPDATE sessions SET revoked_at=now() WHERE user_id=${userId} AND token_hash<>${keepSessionHash} AND revoked_at IS NULL`,
    );
  });
  return { updated: true };
}

const recoverySchema = z
  .object({
    recoveryGrant: z.string().regex(/^[a-f0-9]{64}$/),
    newPassword: z.string().min(12).max(128),
  })
  .strict();
export async function recoverPassword(input: unknown) {
  smsProvider();
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) throw new ContentError("AUTHENTICATION_FAILED", 401);
  await rateLimit("recovery-global", 100);
  await rateLimit(`recovery-grant:${tokenHash(parsed.data.recoveryGrant)}`, 5);
  const hash = await passwordHash(parsed.data.newPassword);
  const result = await db.transaction(async (tx) => {
    const rows = await tx.execute(
      sql`SELECT phone FROM recovery_grants WHERE token_hash=${tokenHash(parsed.data.recoveryGrant)} AND consumed_at IS NULL AND expires_at>now() FOR UPDATE`,
    );
    if (!rows.rows[0]) return { valid: false, token: null };
    await tx.execute(
      sql`UPDATE recovery_grants SET consumed_at=now() WHERE token_hash=${tokenHash(parsed.data.recoveryGrant)}`,
    );
    const users = await tx.execute(
      sql`UPDATE users SET password_hash=${hash} WHERE phone=${rows.rows[0].phone as string} RETURNING id`,
    );
    if (!users.rows[0]) return { valid: true, token: null };
    const id = users.rows[0].id as string;
    await tx.execute(
      sql`UPDATE sessions SET revoked_at=now() WHERE user_id=${id} AND revoked_at IS NULL`,
    );
    return { valid: true, token: await issueSession(tx, id) };
  });
  if (!result.valid) throw new ContentError("AUTHENTICATION_FAILED", 401);
  return result.token;
}
