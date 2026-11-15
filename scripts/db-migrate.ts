import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { pool, databaseDriver } from "../lib/server/db";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sqlite = databaseDriver === "sqlite";
  const directory = sqlite ? "db/sqlite/migrations" : "db/migrations";
  const client = await pool.connect();
  try {
    if (!sqlite) await client.query("SELECT pg_advisory_lock(721104)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text NOT NULL PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT (now()))",
    );
    for (const name of (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const source = await readFile(`${directory}/${name}`, "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      // SQLite serializes migration checks and DDL with the same write transaction.
      await client.query("BEGIN");
      try {
        const previous = await client.query(
          "SELECT checksum FROM schema_migrations WHERE name=$1",
          [name],
        );
        if (previous.rows.length) {
          if (previous.rows[0].checksum !== checksum)
            throw new Error("Applied migration checksum changed");
        } else {
          await client.execScript(source);
          await client.query(
            "INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)",
            [name, checksum],
          );
          console.log(`Applied ${databaseDriver} ${name}`);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    if (!sqlite) await client.query("SELECT pg_advisory_unlock(721104)");
    client.release();
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    "Database operation failed; inspect local connection and migration state securely. Existing data was preserved.",
  );
  process.exitCode = 1;
});
