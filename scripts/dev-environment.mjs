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
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export const image =
  "postgres@sha256:a77aa70e641402a21411b92b721c58d10f23b50ae5fdd2333efd22d166e1e5f7";
const container = "shish-mvp-postgres";
const volume = "shish-mvp-pgdata";

// Classify diagnostics rather than printing raw output, which may include credentials.
function commandError(command, args, result) {
  if (command !== "docker")
    return new Error(
      `Local ${args.at(-1)} failed (exit ${result.status ?? "unavailable"}). Fix the reported migration/seed error and run dev:setup again.`,
    );
  const detail = String(result.stderr ?? "");
  if (result.error?.code === "ENOENT")
    return new Error(
      "Docker CLI was not found. Install Docker Desktop, reopen PowerShell, and check: docker info",
    );
  if (args[0] === "info")
    return new Error(
      "Docker Engine is unavailable. Open Docker Desktop, wait until the engine is running, select Linux containers, then check: docker info",
    );
  let hint =
    "Run docker info and retry. Existing configuration and data were preserved.";
  if (/x509|certificate/i.test(detail))
    hint =
      "Docker registry TLS certificate verification failed. Check Docker Desktop certificate/proxy settings; do not disable TLS verification.";
  else if (
    /port is already allocated|address already in use|bind.*failed/i.test(
      detail,
    )
  )
    hint =
      "Local port 55432 is already in use. Inspect the conflicting service; do not remove database volumes.";
  else if (/unauthorized|denied|forbidden|toomanyrequests/i.test(detail))
    hint =
      "Docker registry access was denied or rate-limited. Check Docker Desktop registry access and retry.";
  else if (/no space left/i.test(detail))
    hint =
      "Docker storage is full. Inspect Docker Desktop storage without deleting project data.";
  else if (/no matching manifest|manifest unknown/i.test(detail))
    hint =
      "The pinned PostgreSQL image is unavailable for this platform. Use Docker Desktop Linux containers and verify image access.";
  else if (
    /timeout|timed out|network|proxy|lookup|dial tcp|connection/i.test(detail)
  )
    hint =
      "Docker could not reach the image registry/service. Check Docker Desktop network/proxy and retry.";
  const pull =
    args[0] === "run"
      ? ` To see the image download diagnostic directly: docker pull ${image}`
      : "";
  return new Error(
    `Docker ${args[0]} failed (exit ${result.status ?? "unavailable"}). ${hint}${pull}`,
  );
}

function connectionFor(value, name = "DATABASE_URL", database = "shish_dev") {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `${name} is invalid; inspect its local configuration without sharing credentials.`,
    );
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55432" ||
    url.pathname !== `/${database}` ||
    !/^[a-z_][a-z0-9_]*$/i.test(decodeURIComponent(url.username))
  )
    throw new Error(
      `${name}: this helper only initializes isolated loopback ${database} on port 55432. Existing configuration was preserved.`,
    );
  return url;
}

export function setupEnvironment({
  cwd = process.cwd(),
  env = process.env,
  run = spawnSync,
  wait = () =>
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000),
  log = console.log,
} = {}) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node24 required");
  if (
    !existsSync(join(cwd, "package.json")) ||
    !existsSync(join(cwd, "db/migrations"))
  )
    throw new Error("Run from the existing MVP repository checkout");
  const file = join(cwd, ".env.local");
  let source = existsSync(file) ? readFileSync(file, "utf8") : "";
  const local = parseEnv(source);
  const base = existsSync(join(cwd, ".env"))
    ? parseEnv(readFileSync(join(cwd, ".env"), "utf8"))
    : {};
  const configuration = { ...base, ...local, ...env };
  if (
    configuration.NODE_ENV === "production" ||
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
  let database = configuration.DATABASE_URL;
  // Validate configured targets before starting or creating any service.
  if (database) connectionFor(database);
  if (configuration.TEST_DATABASE_URL)
    connectionFor(
      configuration.TEST_DATABASE_URL,
      "TEST_DATABASE_URL",
      "shish_test",
    );
  function execute(command, args, options = {}) {
    const result = run(command, args, { cwd, encoding: "utf8", ...options });
    if (result.status !== 0) throw commandError(command, args, result);
    return result.stdout?.trim() ?? "";
  }
  log("Checking Docker Engine (Linux containers required)...");
  if (
    execute("docker", ["info", "--format", "{{.OSType}}"], {
      timeout: 15000,
    }) !== "linux"
  )
    throw new Error(
      "Docker is using Windows containers. Switch Docker Desktop to Linux containers and retry dev:setup.",
    );
  const listed = execute("docker", [
    "ps",
    "--all",
    "--filter",
    `name=^/${container}$`,
    "--format",
    "{{.Names}}",
  ]);
  const existing =
    listed === container
      ? JSON.parse(execute("docker", ["inspect", container]))[0]
      : null;
  const credentials = join(cwd, ".local-data/dev-postgres.env");
  const retained = existsSync(credentials)
    ? parseEnv(readFileSync(credentials, "utf8"))
    : null;
  if (
    retained &&
    (!/^[a-z_][a-z0-9_]*$/i.test(retained.POSTGRES_USER ?? "") ||
      retained.POSTGRES_DB !== "shish_dev" ||
      !/^[a-f0-9]{64}$/.test(retained.POSTGRES_PASSWORD ?? ""))
  )
    throw new Error(
      "Retained local Docker credentials are invalid; preserve the file and inspect locally.",
    );
  const retainedUrl = retained
    ? `postgresql://${retained.POSTGRES_USER}:${retained.POSTGRES_PASSWORD}@127.0.0.1:55432/shish_dev`
    : null;
  if (!existing) {
    if (database)
      throw new Error(
        "Configured database present but local container missing; preserve configuration and inspect manually",
      );
    if (!retained) {
      const probe = run("docker", ["volume", "inspect", volume], {
        cwd,
        encoding: "utf8",
      });
      if (probe.status === 0)
        throw new Error(
          "Existing database volume found without local credentials. Preserve it; do not initialize it with a new password.",
        );
      if (probe.status !== 1 || !/no such volume/i.test(String(probe.stderr)))
        throw commandError("docker", ["volume", "inspect", volume], probe);
    }
    mkdirSync(join(cwd, ".local-data"), { recursive: true, mode: 0o700 });
    const pg = retained ?? {
      POSTGRES_USER: "shish",
      POSTGRES_DB: "shish_dev",
      POSTGRES_PASSWORD: randomBytes(32).toString("hex"),
    };
    if (!retained)
      writeFileSync(
        credentials,
        `POSTGRES_USER=${pg.POSTGRES_USER}\nPOSTGRES_DB=${pg.POSTGRES_DB}\nPOSTGRES_PASSWORD=${pg.POSTGRES_PASSWORD}\n`,
        { flag: "wx", mode: 0o600 },
      );
    database = `postgresql://${pg.POSTGRES_USER}:${pg.POSTGRES_PASSWORD}@127.0.0.1:55432/shish_dev`;
    log("Starting isolated PostgreSQL (first run may download its image)...");
    execute("docker", [
      "run",
      "-d",
      "--name",
      container,
      "--env-file",
      credentials,
      "-p",
      "127.0.0.1:55432:5432",
      "-v",
      `${volume}:/var/lib/postgresql/data`,
      image,
    ]);
  } else {
    const binding = existing.HostConfig.PortBindings?.["5432/tcp"]?.[0];
    if (binding?.HostIp !== "127.0.0.1" || binding.HostPort !== "55432")
      throw new Error(
        "Unexpected local service configuration; preserve existing state",
      );
    if (!database) {
      // Recover an interrupted first setup only with exact private credential and volume proof.
      const mounted = existing.Mounts?.some(
        (mount) =>
          mount.Name === volume &&
          mount.Destination === "/var/lib/postgresql/data",
      );
      const matches =
        retained &&
        Object.entries(retained).every(([key, value]) =>
          existing.Config?.Env?.includes(`${key}=${value}`),
        );
      if (!mounted || !matches || existing.Config?.Image !== image)
        throw new Error(
          "Existing container has no matching local configuration. Preserve its data; inspect locally before continuing.",
        );
      database = retainedUrl;
    }
    if (!existing.State.Running) execute("docker", ["start", container]);
  }
  const connection = connectionFor(database);
  const owner = decodeURIComponent(connection.username);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (
      run("docker", ["exec", container, "pg_isready", "-U", owner], {
        cwd,
        stdio: "ignore",
      }).status === 0
    ) {
      ready = true;
      break;
    }
    wait();
  }
  if (!ready)
    throw new Error(
      "PostgreSQL readiness timeout. Keep the container and .local-data credentials, then retry dev:setup.",
    );
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
    TEST_DATABASE_URL: configuration.TEST_DATABASE_URL || test.href,
    SHISH_ENV: configuration.SHISH_ENV || "development",
    SHISH_DEMO_MODE: configuration.SHISH_DEMO_MODE || "1",
    SHISH_SMS_PROVIDER: "mock",
    SHISH_PAYMENT_PROVIDER: "mock",
    SHISH_MOCK_PAYMENT_SECRET:
      configuration.SHISH_MOCK_PAYMENT_SECRET ||
      randomBytes(32).toString("hex"),
  };
  // Persist only setup keys, preserving unrelated .env/.env.local values and file contents.
  for (const [key, value] of Object.entries(defaults))
    if (!local[key] && !env[key]) source += `\n${key}=${value}\n`;
  if (!existsSync(file) || readFileSync(file, "utf8") !== source)
    writeFileSync(file, source, { mode: 0o600 });
  chmodSync(file, 0o600);
  // Run Node directly: Windows cannot spawn npm.cmd as an executable without a shell.
  for (const script of ["scripts/db-migrate.ts", "scripts/db-seed.ts"])
    execute(
      process.execPath,
      ["--env-file-if-exists=.env.local", "--import", "tsx", script],
      { stdio: "inherit" },
    );
  log(
    "Local development services ready; existing data and configuration preserved. Providers are TEST_ONLY.",
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    setupEnvironment();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Local setup failed",
    );
    process.exitCode = 1;
  }
}
