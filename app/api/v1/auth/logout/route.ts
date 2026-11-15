import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { apiResponse } from "@/lib/server/http";
import { requireSameOrigin } from "@/lib/server/identity";
import { sessionCookie, sessionToken, tokenHash } from "@/lib/server/sessions";

export async function POST(request: Request) {
  const response = await apiResponse(async () => {
    requireSameOrigin(request);
    const token = sessionToken(request);
    if (token)
      await db.execute(
        sql`UPDATE sessions SET revoked_at=now() WHERE token_hash=${tokenHash(token)} AND revoked_at IS NULL`,
      );
    return { signedOut: true };
  });
  if (response.ok)
    response.headers.set("Set-Cookie", sessionCookie(request, "", true));
  return response;
}
