import { sql } from "drizzle-orm";
import { db, pool } from "../lib/server/db";

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.SHISH_DEMO_MODE !== "1"
  ) {
    throw new Error(
      "DEMO_ONLY seed requires SHISH_DEMO_MODE=1 outside production",
    );
  }
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO courses(id,title) VALUES ('shish-de-60','شیش — آلمانی (DEMO_ONLY)') ON CONFLICT(id) DO NOTHING`,
      );
      await tx.execute(
        sql`INSERT INTO lessons(id,course_id,sequence_number,short_title) VALUES ('de-01','shish-de-60',1,'درس نمونه — هنوز منتشر نشده') ON CONFLICT(id) DO NOTHING`,
      );
    });
    console.log("DEMO_ONLY foundation seed is present; no lesson published.");
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    "Database operation failed; inspect local connection and migration state securely.",
  );
  process.exitCode = 1;
});
