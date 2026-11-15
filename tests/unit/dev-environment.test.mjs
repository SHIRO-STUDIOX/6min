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
import { setupEnvironment, image } from "../../scripts/dev-environment.mjs";
const folders = [];
afterEach(() => {
  for (const folder of folders.splice(0))
    rmSync(folder, { recursive: true, force: true });
});
function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "shish-setup-"));
  folders.push(cwd);
  mkdirSync(join(cwd, "db/migrations"), { recursive: true });
  writeFileSync(join(cwd, "package.json"), "{}");
  const state = {
    calls: [],
    logs: [],
    container: null,
    mode: "linux",
    dockerError: null,
    runFailure: null,
    volume: false,
    nodeFailure: false,
  };
  const ok = (stdout = "") => ({ status: 0, stdout, stderr: "" });
  const run = (command, args, options) => {
    state.calls.push({ command, args, options });
    if (command === process.execPath)
      return state.nodeFailure ? { status: 1 } : ok();
    if (args[0] === "info") return state.dockerError ?? ok(state.mode);
    if (args[0] === "ps")
      return ok(state.container ? "shish-mvp-postgres" : "");
    if (args[0] === "inspect") return ok(JSON.stringify([state.container]));
    if (args[0] === "volume")
      return state.volume
        ? ok("[]")
        : { status: 1, stderr: "Error response from daemon: no such volume" };
    if (args[0] === "run") {
      if (state.runFailure) return state.runFailure;
      const pg = parseEnv(
        readFileSync(join(cwd, ".local-data/dev-postgres.env"), "utf8"),
      );
      state.container = {
        HostConfig: {
          PortBindings: {
            "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }],
          },
        },
        State: { Running: true },
        Config: {
          Image: image,
          Env: Object.entries(pg).map(([k, v]) => `${k}=${v}`),
        },
        Mounts: [
          { Name: "shish-mvp-pgdata", Destination: "/var/lib/postgresql/data" },
        ],
      };
      return ok("container-id");
    }
    if (args.includes("psql")) return ok("1");
    return ok();
  };
  const setup = () =>
    setupEnvironment({
      cwd,
      env: {},
      run,
      wait: () => {},
      log: (value) => state.logs.push(value),
    });
  return { cwd, state, setup };
}
it("fresh setup persists local configuration, runs migrations through Node on all platforms, and is repeatable", () => {
  const { cwd, state, setup } = fixture();
  writeFileSync(join(cwd, ".env"), "UNRELATED=keep-base\n");
  setup();
  const before = readFileSync(join(cwd, ".env.local"), "utf8");
  const config = parseEnv(before);
  expect(config.DATABASE_URL).toMatch(/127\.0\.0\.1:55432\/shish_dev$/);
  expect(config.SHISH_SMS_PROVIDER).toBe("mock");
  expect(config.SHISH_MOCK_PAYMENT_SECRET).toHaveLength(64);
  const calls = state.calls.filter((c) => c.command === process.execPath);
  expect(calls.map((c) => c.args.at(-1))).toEqual([
    "scripts/db-migrate.ts",
    "scripts/db-seed.ts",
  ]);
  expect(
    calls.every(
      (c) =>
        c.args[0] === "--env-file-if-exists=.env.local" && !c.options.shell,
    ),
  ).toBe(true);
  expect(
    state.calls.some((c) => c.command === "npm" || c.command === "npm.cmd"),
  ).toBe(false);
  setup();
  expect(readFileSync(join(cwd, ".env.local"), "utf8")).toBe(before);
  expect(readFileSync(join(cwd, ".env"), "utf8")).toBe("UNRELATED=keep-base\n");
  expect(state.calls.filter((c) => c.args[0] === "run")).toHaveLength(1);
  expect(state.logs.join(" ")).not.toContain(config.SHISH_MOCK_PAYMENT_SECRET);
  expect(state.logs.join(" ")).not.toContain(
    new URL(config.DATABASE_URL).password,
  );
});
it.each([
  [{ status: null, error: { code: "ENOENT" } }, "Docker CLI was not found"],
  [
    { status: 1, stderr: "open //./pipe/dockerDesktopLinuxEngine: not found" },
    "Docker Engine is unavailable",
  ],
])(
  "diagnoses Docker prerequisites before writing configuration or creating a database",
  (failure, message) => {
    const { cwd, state, setup } = fixture();
    state.dockerError = failure;
    expect(setup).toThrow(message);
    expect(existsSync(join(cwd, ".env.local"))).toBe(false);
    expect(state.calls).toHaveLength(1);
  },
);
it("refuses Windows containers and gives the Linux engine instruction", () => {
  const { state, setup } = fixture();
  state.mode = "windows";
  expect(setup).toThrow("Switch Docker Desktop to Linux containers");
  expect(state.calls).toHaveLength(1);
});
it("diagnoses an image pull error without leaking raw credentials, and preserves the generated credential for retry", () => {
  const { cwd, state, setup } = fixture();
  state.runFailure = {
    status: 125,
    stderr:
      "proxy connection timeout postgresql://private:do-not-print@host/db",
  };
  expect(setup).toThrow("network/proxy");
  const retained = readFileSync(
    join(cwd, ".local-data/dev-postgres.env"),
    "utf8",
  );
  expect(existsSync(join(cwd, ".env.local"))).toBe(false);
  try {
    setup();
  } catch (e) {
    expect(e.message).not.toContain("do-not-print");
    expect(e.message).not.toContain("postgresql://");
  }
  state.runFailure = null;
  setup();
  expect(readFileSync(join(cwd, ".local-data/dev-postgres.env"), "utf8")).toBe(
    retained,
  );
});
it("recovers interrupted first setup only with matching private credential, image and volume proof", () => {
  const { cwd, state, setup } = fixture();
  state.nodeFailure = true;
  expect(setup).toThrow("db-migrate.ts failed");
  const configured = parseEnv(readFileSync(join(cwd, ".env.local"), "utf8"));
  // Simulate interruption before .env.local was written; leave helper-owned credentials/container.
  rmSync(join(cwd, ".env.local"));
  state.nodeFailure = false;
  setup();
  expect(
    parseEnv(readFileSync(join(cwd, ".env.local"), "utf8")).DATABASE_URL,
  ).toBe(configured.DATABASE_URL);
  rmSync(join(cwd, ".env.local"));
  state.container.Config.Env = [];
  expect(setup).toThrow("no matching local configuration");
  expect(existsSync(join(cwd, ".env.local"))).toBe(false);
});
it("never reinitializes an existing volume whose credentials are unknown", () => {
  const { state, setup } = fixture();
  state.volume = true;
  expect(setup).toThrow(
    "Existing database volume found without local credentials",
  );
  expect(state.calls.some((c) => c.args[0] === "run")).toBe(false);
});
it.each([
  "DATABASE_URL=postgresql://owner:password@remote.example:5432/production\n",
  "SHISH_ENV=production\n",
  "SHISH_PAYMENT_PROVIDER=real\n",
])("honors .env safeguards before touching Docker", (source) => {
  const { cwd, state, setup } = fixture();
  writeFileSync(join(cwd, ".env"), source);
  expect(setup).toThrow();
  expect(state.calls).toHaveLength(0);
  expect(readFileSync(join(cwd, ".env"), "utf8")).toBe(source);
});
