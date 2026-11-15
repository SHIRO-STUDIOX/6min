#!/usr/bin/env node
// Isolated local setup only. Never reset databases, remove volumes or print secrets.
import { randomBytes } from "node:crypto";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
const image =
  "postgres@sha256:a77aa70e641402a21411b92b721c58d10f23b50ae5fdd2333efd22d166e1e5f7";
function execute(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0)
    throw new Error(`${command} failed; inspect local prerequisites securely`);
  return result.stdout?.trim() ?? "";
}
function main() {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node24 required");
  if (!existsSync("package.json") || !existsSync("db/migrations"))
    throw new Error("Run from the existing MVP repository checkout");
  const file = ".env.local";
  let source = existsSync(file) ? readFileSync(file, "utf8") : "";
  const local = parseEnv(source);
  const configuration = { ...local, ...process.env };
  if (
    process.env.NODE_ENV === "production" ||
    configuration.SHISH_ENV === "production"
  )
    throw new Error("Local helper refuses Production");
  if (
    (configuration.SHISH_SMS_PROVIDER &&
      configuration.SHISH_SMS_PROVIDER !== "mock") ||
    (configuration.SHISH_PAYMENT_PROVIDER &&
      configuration.SHISH_PAYMENT_PROVIDER !== "mock")
  )
    throw new Error("Use isolated mock providers for this helper");
  const container = "shish-mvp-postgres";
  let database = configuration.DATABASE_URL;
  const inspection = spawnSync("docker", ["inspect", container], {
    encoding: "utf8",
  });
  const existing =
    inspection.status === 0 ? JSON.parse(inspection.stdout)[0] : null;
  if (!existing) {
    if (database)
      throw new Error(
        "Configured database present but local container missing; preserve configuration and inspect manually",
      );
    mkdirSync(".local-data", { recursive: true, mode: 0o700 });
    const credentials = ".local-data/dev-postgres.env";
    if (!existsSync(credentials))
      writeFileSync(
        credentials,
        `POSTGRES_USER=shish\nPOSTGRES_DB=shish_dev\nPOSTGRES_PASSWORD=${randomBytes(32).toString("hex")}\n`,
        { flag: "wx", mode: 0o600 },
      );
    const pg = parseEnv(readFileSync(credentials, "utf8"));
    database = `postgresql://${pg.POSTGRES_USER}:${pg.POSTGRES_PASSWORD}@127.0.0.1:55432/shish_dev`;
    execute(
      "docker",
      [
        "run",
        "-d",
        "--name",
        container,
        "--env-file",
        credentials,
        "-p",
        "127.0.0.1:55432:5432",
        "-v",
        "shish-mvp-pgdata:/var/lib/postgresql/data",
        image,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } else {
    const binding = existing.HostConfig.PortBindings?.["5432/tcp"]?.[0];
    if (
      binding?.HostIp !== "127.0.0.1" ||
      binding.HostPort !== "55432" ||
      !database
    )
      throw new Error(
        "Unexpected local service configuration; preserve existing state",
      );
    if (!existing.State.Running) execute("docker", ["start", container]);
  }
  const connection = new URL(database);
  if (
    !["localhost", "127.0.0.1"].includes(connection.hostname) ||
    connection.port !== "55432" ||
    connection.pathname !== "/shish_dev"
  )
    throw new Error("Helper only initializes isolated loopback shish_dev");
  const owner = decodeURIComponent(connection.username);
  if (!/^[a-z_][a-z0-9_]*$/i.test(owner))
    throw new Error("Unsupported local role");
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (
      spawnSync("docker", ["exec", container, "pg_isready", "-U", owner], {
        stdio: "ignore",
      }).status === 0
    ) {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (!ready) throw new Error("PostgreSQL readiness timeout");
  if (
    execute("docker", [
      "exec",
      container,
      "psql",
      "-U",
      owner,
      "-d",
      "postgres",
      "-tAc",
      "SELECT 1 FROM pg_database WHERE datname='shish_test'",
    ]) !== "1"
  )
    execute("docker", [
      "exec",
      container,
      "createdb",
      "-U",
      owner,
      "shish_test",
    ]);
  const test = new URL(connection);
  test.pathname = "/shish_test";
  const defaults = {
    DATABASE_URL: database,
    TEST_DATABASE_URL: test.href,
    SHISH_ENV: "development",
    SHISH_DEMO_MODE: "1",
    SHISH_SMS_PROVIDER: "mock",
    SHISH_PAYMENT_PROVIDER: "mock",
    SHISH_MOCK_PAYMENT_SECRET: randomBytes(32).toString("hex"),
  };
  for (const [key, value] of Object.entries(defaults))
    if (!configuration[key]) source += `\n${key}=${value}\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== source)
    writeFileSync(file, source, { mode: 0o600 });
  chmodSync(file, 0o600);
  for (const task of ["db:migrate", "db:seed"])
    execute("npm", ["run", task], { stdio: "inherit" });
  console.log(
    "Local development services ready; existing data and configuration preserved. Providers are TEST_ONLY.",
  );
}
try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local setup failed");
  process.exitCode = 1;
}
