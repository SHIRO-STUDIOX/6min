import {
  localSqlitePath,
  sameSqliteFile,
} from "../lib/server/database/local-sqlite-path.mjs";
import { spawnSync } from "node:child_process";

const sqlite =
  process.argv.includes("--sqlite") || process.env.SHISH_DB_DRIVER === "sqlite";
const database = sqlite
  ? process.env.TEST_DATABASE_URL?.startsWith("sqlite:")
    ? process.env.TEST_DATABASE_URL
    : "sqlite:./.local-data/shish-test.sqlite"
  : process.env.TEST_DATABASE_URL;
if (!database || database === process.env.DATABASE_URL) {
  // CI may explicitly use its one disposable test database for both variables.
  if (!(process.env.CI && database))
    throw new Error(
      "A distinct TEST_DATABASE_URL is required for committed integration-test records",
    );
}
if (
  sqlite &&
  process.env.DATABASE_URL?.startsWith("sqlite:") &&
  database &&
  sameSqliteFile(
    localSqlitePath(database),
    localSqlitePath(process.env.DATABASE_URL),
  )
)
  throw new Error(
    "A distinct SQLite test file is required; development data must not be used for tests",
  );
const environment = {
  ...process.env,
  DATABASE_URL: database!,
  SHISH_DB_DRIVER: sqlite ? "sqlite" : "postgres",
  SHISH_SMS_PROVIDER: "mock",
  SHISH_PAYMENT_PROVIDER: "mock",
  SHISH_MOCK_PAYMENT_SECRET: sqlite
    ? "sqlite-tests-public-fixture-key-never-production"
    : process.env.SHISH_MOCK_PAYMENT_SECRET,
  SHISH_ENV: "test",
  SHISH_DEMO_MODE: "1",
};
for (const args of [
  ["--import", "tsx", "scripts/db-migrate.ts"],
  ["--import", "tsx", "scripts/db-seed.ts"],
  ["node_modules/vitest/vitest.mjs", "run", "tests/integration"],
]) {
  const result = spawnSync(process.execPath, args, {
    env: environment,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
