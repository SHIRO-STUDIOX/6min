// Use Node's supported --import preloader rather than --env-file: Next dev
// forwards exec arguments into worker NODE_OPTIONS, where --env-file is forbidden.
import { existsSync } from "node:fs";
import { localSqliteConfig, sqliteProfile } from "./local-sqlite-setup.mjs";
if (!existsSync(sqliteProfile))
  throw new Error("Run start.ps1 or npm run dev:sqlite first");
// NODE_ENV=production is also Next's local build/preview mode. SHISH_ENV remains
// the deployment guard; a real Production deployment must use PostgreSQL.
const { values } = localSqliteConfig(process.cwd(), {
  ...process.env,
  NODE_ENV: "development",
});
Object.assign(process.env, values);
