import {
  localSqlitePath,
  sameSqliteFile,
} from "../lib/server/database/local-sqlite-path.mjs";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
export const sqliteProfile = ".env.sqlite.local";
export function localSqliteConfig(cwd = process.cwd(), env = process.env) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node.js24 or newer is required");
  const read = (name) =>
    existsSync(join(cwd, name))
      ? parseEnv(readFileSync(join(cwd, name), "utf8"))
      : {};
  const previous = { ...read(".env"), ...read(".env.local"), ...env };
  if (previous.NODE_ENV === "production" || previous.SHISH_ENV === "production")
    throw new Error(
      "Local SQLite launcher refuses a Production environment. Keep Production separate.",
    );
  const local = read(sqliteProfile);
  const defaults = {
    NEXT_TELEMETRY_DISABLED: "1",
    HEROUI_ANALYTICS_DISABLED: "1",
    SHISH_DB_DRIVER: "sqlite",
    DATABASE_URL: "sqlite:./.local-data/shish-dev.sqlite",
    TEST_DATABASE_URL: "sqlite:./.local-data/shish-test.sqlite",
    SHISH_ENV: "development",
    SHISH_DEMO_MODE: "1",
    SHISH_SMS_PROVIDER: "mock",
    SHISH_PAYMENT_PROVIDER: "mock",
    SHISH_MOCK_PAYMENT_SECRET:
      local.SHISH_MOCK_PAYMENT_SECRET || randomBytes(32).toString("hex"),
  };
  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [
      key,
      Object.hasOwn(local, key) ? local[key] : value,
    ]),
  );
  if (
    values.SHISH_DB_DRIVER !== "sqlite" ||
    !["development", "test"].includes(values.SHISH_ENV) ||
    values.SHISH_DEMO_MODE !== "1" ||
    values.SHISH_SMS_PROVIDER !== "mock" ||
    values.SHISH_PAYMENT_PROVIDER !== "mock"
  )
    throw new Error(
      "The local SQLite profile must use explicit development/test, demo content and mock providers",
    );
  const database = localSqlitePath(values.DATABASE_URL, cwd),
    test = localSqlitePath(values.TEST_DATABASE_URL, cwd);
  if (sameSqliteFile(database, test))
    throw new Error("Development and test SQLite files must be different");
  if (
    values.SHISH_MOCK_PAYMENT_SECRET.length < 32 ||
    /[\r\n]/.test(values.SHISH_MOCK_PAYMENT_SECRET)
  )
    throw new Error(
      "The local mock payment key must have at least32 characters",
    );
  return { values, local };
}
export function setupLocalSqlite({
  cwd = process.cwd(),
  env = process.env,
  run = spawnSync,
  log = console.log,
  checkOnly = false,
} = {}) {
  const { values, local } = localSqliteConfig(cwd, env);
  if (checkOnly) return values;
  const file = join(cwd, sqliteProfile);
  let source = existsSync(file)
    ? readFileSync(file, "utf8")
    : "# Local SQLite only. Generated secrets are private; never commit this file.\n";
  for (const [key, value] of Object.entries(values))
    if (!Object.hasOwn(local, key))
      source += `${key}=${JSON.stringify(value)}\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== source)
    writeFileSync(file, source, { mode: 0o600 });
  chmodSync(file, 0o600);
  log("[SQLite] Applying local schema and loading synthetic lessons...");
  const childEnv = { ...env, ...values };
  for (const script of ["scripts/db-migrate.ts", "scripts/db-seed.ts"]) {
    const result = run(process.execPath, ["--import", "tsx", script], {
      cwd,
      env: childEnv,
      stdio: "inherit",
    });
    if (result.status !== 0)
      throw new Error(
        `Local SQLite ${script} failed. Existing files were preserved; inspect the error and retry.`,
      );
  }
  log(
    "[SQLite] Ready. Separate development/test files; no external database service required.",
  );
  return values;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    setupLocalSqlite({ checkOnly: process.argv.includes("--check") });
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Local SQLite setup failed",
    );
    process.exitCode = 1;
  }
}
