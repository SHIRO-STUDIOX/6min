import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

const globalDb = globalThis as unknown as { shishPool?: Pool };
export const pool =
  globalDb.shishPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
  });
if (process.env.NODE_ENV !== "production") globalDb.shishPool = pool;
export const db = drizzle(pool);
