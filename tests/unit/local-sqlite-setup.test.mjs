import { afterEach, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseEnv } from "node:util";
import {
  setupLocalSqlite,
  localSqliteConfig,
} from "../../scripts/local-sqlite-setup.mjs";
const folders = [];
afterEach(() => {
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true });
});
function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "shish-local-profile-"));
  folders.push(cwd);
  const calls = [];
  const run = (...args) => {
    calls.push(args);
    return { status: 0 };
  };
  const setup = () => setupLocalSqlite({ cwd, env: {}, run, log: () => {} });
  return { cwd, calls, setup };
}
it("uses a dedicated SQLite profile, preserves PostgreSQL configuration and runs ordered Node tasks without any external database commands", () => {
  const { cwd, calls, setup } = fixture();
  const pg =
    "DATABASE_URL=postgresql://local:private@localhost:55432/shish_dev\nSHISH_ENV=development\n";
  writeFileSync(join(cwd, ".env.local"), pg);
  setup();
  const before = readFileSync(join(cwd, ".env.sqlite.local"), "utf8");
  const values = parseEnv(before);
  expect(values.SHISH_DB_DRIVER).toBe("sqlite");
  expect(values.DATABASE_URL).not.toBe(values.TEST_DATABASE_URL);
  expect(values.SHISH_MOCK_PAYMENT_SECRET.length).toBeGreaterThanOrEqual(32);
  expect(readFileSync(join(cwd, ".env.local"), "utf8")).toBe(pg);
  expect(calls.map((c) => c[1].at(-1))).toEqual([
    "scripts/db-migrate.ts",
    "scripts/db-seed.ts",
  ]);
  expect(
    calls.every(
      (c) =>
        c[0] === process.execPath &&
        c[2].env.SHISH_DB_DRIVER === "sqlite" &&
        !c[2].shell,
    ),
  ).toBe(true);
  setup();
  expect(readFileSync(join(cwd, ".env.sqlite.local"), "utf8")).toBe(before);
});
it("preflight is read-only, and Production or live-provider profiles fail closed", () => {
  const { cwd } = fixture();
  setupLocalSqlite({ cwd, env: {}, checkOnly: true });
  expect(existsSync(join(cwd, ".env.sqlite.local"))).toBe(false);
  expect(() => localSqliteConfig(cwd, { SHISH_ENV: "production" })).toThrow(
    "Production",
  );
  writeFileSync(
    join(cwd, ".env.sqlite.local"),
    "SHISH_PAYMENT_PROVIDER=real\n",
  );
  expect(() => localSqliteConfig(cwd, {})).toThrow("mock providers");
});
it("rejects shared test/development or escaped file paths without deleting/rewriting the profile", () => {
  const { cwd, setup } = fixture();
  for (const content of [
    "DATABASE_URL=sqlite:../escape.sqlite\n",
    "DATABASE_URL=sqlite:./.local-data/same.sqlite\nTEST_DATABASE_URL=sqlite:./.local-data/same.sqlite\n",
  ]) {
    writeFileSync(join(cwd, ".env.sqlite.local"), content);
    expect(setup).toThrow();
    expect(readFileSync(join(cwd, ".env.sqlite.local"), "utf8")).toBe(content);
  }
});

it("preserves unrelated profile lines without exporting them into child processes", () => {
  const { cwd, calls, setup } = fixture();
  writeFileSync(join(cwd, ".env.sqlite.local"), "CUSTOM_UNRELATED=preserved\n");
  setup();
  expect(readFileSync(join(cwd, ".env.sqlite.local"), "utf8")).toContain(
    "CUSTOM_UNRELATED=preserved",
  );
  expect(
    calls.every((call) => call[2].env.CUSTOM_UNRELATED === undefined),
  ).toBe(true);
});

it("stops before seed on migration failure and retains the profile for a safe retry", () => {
  const { cwd } = fixture();
  const calls = [];
  expect(() =>
    setupLocalSqlite({
      cwd,
      env: {},
      log: () => {},
      run: (_command, args) => {
        calls.push(args.at(-1));
        return { status: 1 };
      },
    }),
  ).toThrow("db-migrate.ts failed");
  expect(calls).toEqual(["scripts/db-migrate.ts"]);
  const retained = readFileSync(join(cwd, ".env.sqlite.local"), "utf8");
  setupLocalSqlite({ cwd, env: {}, log: () => {}, run: () => ({ status: 0 }) });
  expect(readFileSync(join(cwd, ".env.sqlite.local"), "utf8")).toBe(retained);
});
