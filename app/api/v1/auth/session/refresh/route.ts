import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/request-security";
import { apiResponse } from "@/lib/server/http";
import { requireSameOrigin } from "@/lib/server/identity";
import {
  authenticatedSession,
  issueSession,
  sessionCookie,
} from "@/lib/server/sessions";
import { ContentError } from "@/lib/server/content";

export async function POST(request: Request) {
  let token: string | null = null;
  const response = await apiResponse(async () => {
    requireSameOrigin(request);
    const session = await authenticatedSession(request);
    await rateLimit(`session-refresh:${session.subject.id}`, 30);
    token = await db.transaction(async (tx) => {
      const row = await tx.execute(
        sql`UPDATE sessions SET revoked_at=now() WHERE token_hash=${session.hash} AND revoked_at IS NULL AND expires_at>now() RETURNING user_id`,
      );
      if (!row.rows.length)
        throw new ContentError("AUTHENTICATION_REQUIRED", 401);
      return issueSession(
        tx,
        session.subject.id,
        session.newAccount,
        session.sourceGuestId,
        session.authenticatedAt,
      );
    });
    return { refreshed: true };
  });
  if (token) response.headers.set("Set-Cookie", sessionCookie(request, token));
  return response;
}
