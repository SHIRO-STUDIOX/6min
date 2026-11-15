import { localSqlitePath } from "./local-sqlite-path.mjs";
export function databaseConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
  cwd = process.cwd(),
) {
  const url = env.DATABASE_URL ?? "";
  const driver =
    env.SHISH_DB_DRIVER ?? (url.startsWith("sqlite:") ? "sqlite" : "postgres");
  if (driver === "postgres") {
    if (url && !/^postgres(ql)?:\/\//.test(url))
      throw new Error("PostgreSQL requires a PostgreSQL DATABASE_URL");
    return { driver: "postgres" as const, url };
  }
  if (driver !== "sqlite") throw new Error("Unsupported database driver");
  if (!["development", "test"].includes(env.SHISH_ENV ?? ""))
    throw new Error(
      "SQLite is restricted to explicit local development/test; Production requires PostgreSQL",
    );
  const filename = localSqlitePath(url, cwd);
  return { driver: "sqlite" as const, url, filename };
}
