import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { Client } from "pg";
async function main() {
  const source = new URL(process.env.TEST_DATABASE_URL ?? "");
  if (
    !["127.0.0.1", "localhost"].includes(source.hostname) ||
    source.port !== "55432" ||
    source.pathname !== "/shish_test"
  )
    throw new Error("Drill requires isolated local shish_test on55432");
  const owner = decodeURIComponent(source.username),
    database = source.pathname.slice(1),
    target = `shish_restore_${Date.now()}`;
  function docker(args: string[], input?: Buffer) {
    const result = spawnSync(
      "docker",
      ["exec", ...(input ? ["-i"] : []), "shish-mvp-postgres", ...args],
      { input, maxBuffer: 64 * 1024 * 1024 },
    );
    if (result.status !== 0)
      throw new Error("Local backup command failed; inspect securely");
    return result.stdout;
  }
  const backup = docker([
    "pg_dump",
    "-U",
    owner,
    "-d",
    database,
    "-Fc",
    "--no-owner",
  ]);
  const folder = ".local-data/backup-drills";
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await writeFile(`${folder}/${target}.dump`, backup, {
    flag: "wx",
    mode: 0o600,
  });
  docker(["createdb", "-U", owner, target]);
  docker(
    ["pg_restore", "-U", owner, "-d", target, "--no-owner", "--exit-on-error"],
    backup,
  );
  const restored = new URL(source);
  restored.pathname = "/" + target;
  const left = new Client({ connectionString: source.href }),
    right = new Client({ connectionString: restored.href });
  await left.connect();
  await right.connect();
  try {
    const { rows } = await left.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    );
    const evidence = [];
    for (const { tablename } of rows) {
      if (!/^[a-z_]+$/.test(tablename)) throw new Error("Unexpected table");
      const statement = `SELECT count(*)::int AS count,md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) AS digest FROM public."${tablename}" t`;
      const a = (await left.query(statement)).rows[0],
        b = (await right.query(statement)).rows[0];
      if (a.count !== b.count || a.digest !== b.digest)
        throw new Error(
          "Restored data mismatch; source must remain quiet during drill",
        );
      evidence.push({ table: tablename, count: a.count, matched: true });
    }
    const result = {
      executedAt: new Date().toISOString(),
      source: "isolated local test database",
      restoreDatabase: target,
      sha256: createHash("sha256").update(backup).digest("hex"),
      tables: evidence,
      destructiveOperations: false,
    };
    await writeFile(
      `${folder}/${target}.json`,
      JSON.stringify(result, null, 2),
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        status: "PASS",
        tables: evidence.length,
        restoreDatabase: target,
        archive: `${folder}/${target}.dump`,
        sha256: result.sha256,
      }),
    );
  } finally {
    await left.end();
    await right.end();
  }
}
void main().catch(() => {
  console.error(
    "Restore drill failed; no source data was deleted. Inspect local artifacts securely.",
  );
  process.exitCode = 1;
});
