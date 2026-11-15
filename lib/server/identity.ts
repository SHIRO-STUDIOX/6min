import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { ContentError } from "./content";

export type Subject = { id: string; kind: "guest" | "user" };
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new ContentError("ORIGIN_REQUIRED", 403);
}

export async function guestIdentity(request: Request): Promise<Subject> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("shish_guest="))
    ?.slice("shish_guest=".length);
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new ContentError("IDENTITY_REQUIRED", 401);
  const result = await db.execute(
    sql`SELECT s.id,s.kind FROM guest_sessions g JOIN subjects s ON s.id=g.subject_id WHERE g.token_hash=${digest(token)} AND g.expires_at>now() AND s.kind='guest'`,
  );
  if (!result.rows[0]) throw new ContentError("IDENTITY_REQUIRED", 401);
  return result.rows[0] as Subject;
}

export async function createGuest(request: Request) {
  try {
    return { subject: await guestIdentity(request), cookie: null };
  } catch (error) {
    if (!(error instanceof ContentError) || error.status !== 401) throw error;
  }
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  await db.transaction(async (tx) => {
    await tx.execute(sql`INSERT INTO subjects(id,kind) VALUES (${id},'guest')`);
    await tx.execute(
      sql`INSERT INTO guest_sessions(token_hash,subject_id,expires_at) VALUES (${digest(token)},${id},now()+interval '30 days')`,
    );
  });
  return {
    subject: { id, kind: "guest" } as Subject,
    cookie: `shish_guest=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
  };
}
