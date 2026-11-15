import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { authenticatedSession } from "@/lib/server/sessions";
import { apiResponse } from "@/lib/server/http";

export async function GET(request: Request) {
  return apiResponse(async () => {
    const { subject } = await authenticatedSession(request);
    const result = await db.execute(
      sql`SELECT id,display_name,avatar_key,auth_mode FROM users WHERE id=${subject.id}`,
    );
    const user = result.rows[0];
    return {
      id: user.id,
      displayName: user.display_name,
      avatarKey: user.avatar_key,
      authMode: user.auth_mode,
    };
  });
}
