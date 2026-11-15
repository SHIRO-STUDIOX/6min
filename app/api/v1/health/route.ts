import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = randomUUID();
  try {
    if (!process.env.DATABASE_URL) throw new Error("Database not configured");
    await db.execute(sql`SELECT 1 FROM schema_migrations LIMIT 1`);
    return Response.json(
      { data: { ready: true }, meta: { requestId, version: "v1" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable",
          requestId,
          retryable: true,
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
