import { sql } from "drizzle-orm";
import { db } from "./db";
import { demoContentAllowed } from "../contracts/content";
import { ContentError } from "./content";
import type { Subject } from "./identity";

type Executor = Pick<typeof db, "execute">;
export async function commercialAllowed(
  subject: Subject | null,
  number: number,
  executor: Executor = db,
) {
  if (number >= 1 && number <= 3) return true;
  if (number < 1 || number > 60 || subject?.kind !== "user") return false;
  const result =
    await executor.execute(sql`SELECT 1 FROM entitlements e JOIN purchases p ON p.id=e.source_purchase_id AND p.user_id=e.user_id
    WHERE e.user_id=${subject.id} AND e.product_id='shish-de-60' AND e.revoked_at IS NULL AND p.status='verified' AND (p.provider<>'mock_TEST_ONLY' OR ${demoContentAllowed()}) LIMIT 1`);
  return result.rows.length > 0;
}
export async function assertCommercialAccess(
  executor: Executor,
  subject: Subject,
  number: number,
) {
  if (!(await commercialAllowed(subject, number, executor)))
    throw new ContentError("ENTITLEMENT_REQUIRED", 403);
}
