import { sql } from "drizzle-orm";
import { db } from "./db";
import { ContentError } from "./content";

export async function rateLimit(scope: string, limit: number) {
  const result = await db.execute(sql`INSERT INTO request_budgets(key,window_start,count) VALUES (${scope},date_trunc('minute',now()),1)
    ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,count=CASE WHEN request_budgets.window_start=excluded.window_start THEN request_budgets.count+1 ELSE 1 END RETURNING count`);
  if (Number(result.rows[0].count) > limit) throw new ContentError("RATE_LIMITED", 429);
}

export async function readJson(request: Request, maxBytes = 32768): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ContentError("JSON_REQUIRED", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ContentError("INVALID_JSON", 422);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0; let source = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new ContentError("BODY_TOO_LARGE", 413); }
      source += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(source + decoder.decode());
  } catch (error) {
    if (error instanceof ContentError) throw error;
    throw new ContentError("INVALID_JSON", 422);
  } finally { reader.releaseLock(); }
}
