import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { pool } from "../lib/server/db";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(721104)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of (await readdir("db/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const source = await readFile(`db/migrations/${name}`, "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const previous = await client.query(
        "SELECT checksum FROM schema_migrations WHERE name=$1",
        [name],
      );
      if (previous.rows.length) {
        if (previous.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(source);
        await client.query(
          "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
          [name, checksum],
        );
        await client.query("COMMIT");
        console.log(`Applied ${name}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(721104)");
    client.release();
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    "Database operation failed; inspect local connection and migration state securely.",
  );
  process.exitCode = 1;
});
