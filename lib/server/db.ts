import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { databaseConfig } from "./database/config";
import { sqliteDatabase } from "./database/sqlite";
import type { DataPool, DataStore } from "./database/types";
const config = databaseConfig();
export const databaseDriver = config.driver;
const globalDb = globalThis as unknown as {
  shishDatabase?: { key: string; pool: DataPool; db: DataStore };
};
const key = config.driver + ":" + config.url;
function create() {
  if (config.driver === "sqlite") return sqliteDatabase(config.filename);
  const native = new Pool({
    connectionString: config.url || undefined,
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
  });
  const original = drizzle(native);
  const pool: DataPool = {
    query: (text, values) => native.query(text, values),
    async connect() {
      const client = await native.connect();
      return {
        query: (text, values) => client.query(text, values),
        async execScript(source) {
          await client.query(source);
        },
        release: () => client.release(),
      };
    },
    end: () => native.end(),
  };
  const db: DataStore = {
    execute: (query) => original.execute(query),
    transaction: (action) =>
      original.transaction((tx) =>
        action({ execute: (query) => tx.execute(query) }),
      ),
  };
  return { pool, db };
}
const selected =
  globalDb.shishDatabase?.key === key ? globalDb.shishDatabase : create();
export const pool = selected.pool;
export const db = selected.db;
if (process.env.NODE_ENV !== "production" || config.driver === "sqlite")
  globalDb.shishDatabase = { key, ...selected };
