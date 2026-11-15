import { createHash, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { demoContentAllowed } from "../contracts/content";
import { ContentError } from "./content";
import { assertExpectedSubject } from "./subject-consistency";
import type { Subject } from "./identity";

export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function issueSession(
  tx: Transaction,
  userId: string,
  newAccount = false,
  sourceGuestId: string | null = null,
  authenticatedAt: string | null = null,
) {
  const token = randomBytes(32).toString("hex");
  await tx.execute(
    sql`INSERT INTO sessions(token_hash,user_id,expires_at,new_account,source_guest_id,authenticated_at) VALUES (${tokenHash(token)},${userId},now()+interval '7 days',${newAccount},${sourceGuestId},COALESCE(${authenticatedAt}::timestamptz,now()))`,
  );
  return token;
}
export function sessionCookie(request: Request, token: string, clear = false) {
  return `shish_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 604800}${new URL(request.url).protocol === "https:" || process.env.SHISH_ENV === "production" ? "; Secure" : ""}`;
}
export function sessionToken(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("shish_session="))
    ?.slice("shish_session=".length);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export async function authenticatedSession(request: Request) {
  const token = sessionToken(request);
  if (!token) throw new ContentError("AUTHENTICATION_REQUIRED", 401);
  const result =
    await db.execute(sql`SELECT s.token_hash,s.user_id,s.new_account,s.source_guest_id,s.created_at,s.authenticated_at
    FROM sessions s JOIN users u ON u.id=s.user_id JOIN subjects p ON p.id=u.id AND p.kind='user'
    WHERE s.token_hash=${tokenHash(token)} AND s.revoked_at IS NULL AND s.expires_at>now() AND u.phone_verified_at IS NOT NULL AND (u.auth_mode='real' OR ${demoContentAllowed()})`);
  const row = result.rows[0];
  if (!row) throw new ContentError("AUTHENTICATION_REQUIRED", 401);
  assertExpectedSubject(request, String(row.user_id));
  return {
    subject: { id: row.user_id as string, kind: "user" } as Subject,
    hash: row.token_hash as string,
    newAccount: Boolean(row.new_account),
    sourceGuestId: row.source_guest_id as string | null,
    authenticatedAt: new Date(row.authenticated_at as string).toISOString(),
    recent:
      Date.now() - new Date(row.authenticated_at as string).getTime() < 600000,
  };
}
