import { spawnSync } from "node:child_process";

const database = process.env.TEST_DATABASE_URL;
if (!database || database === process.env.DATABASE_URL) {
  // CI may explicitly use its one disposable test database for both variables.
  if (!(process.env.CI && database))
    throw new Error(
      "A distinct TEST_DATABASE_URL is required for committed integration-test records",
    );
}
const environment = {
  ...process.env,
  DATABASE_URL: database!,
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
