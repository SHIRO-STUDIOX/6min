import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { PgDialect } from "drizzle-orm/pg-core";
import { sqliteSql } from "./sqlite-sql";
import type { Connection, DataPool, DataStore, QueryResult } from "./types";
const dialect = new PgDialect();
function timestamp(value: unknown) {
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid timestamp");
  const iso = date.toISOString();
  const fraction = /\.(\d+)Z$/.exec(String(value))?.[1] ?? iso.slice(20, 23);
  return iso.slice(0, 19) + "." + fraction.padEnd(6, "0").slice(0, 6) + "Z";
}
function parameter(value: unknown): SQLInputValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return timestamp(value.toISOString());
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    value instanceof Uint8Array
  )
    return value;
  throw new Error("Unsupported SQLite parameter type");
}
function dbError(error: unknown) {
  const source = error as Error & { errcode?: number };
  const mapped = new Error(source.message) as Error & { code?: string };
  mapped.code =
    (
      {
        2067: "23505",
        1555: "23505",
        275: "23514",
        787: "23503",
        1299: "23502",
        1811: "P0001",
      } as Record<number, string>
    )[source.errcode ?? 0] ?? "SQLITE_ERROR";
  return mapped;
}
export function sqliteDatabase(filename: string): {
  pool: DataPool;
  db: DataStore;
} {
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  chmodSync(dirname(filename), 0o700);
  const native = new DatabaseSync(filename, {
    enableForeignKeyConstraints: true,
    allowExtension: false,
  });
  chmodSync(filename, 0o600);
  native.exec(
    "PRAGMA busy_timeout=15000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;",
  );
  let lastMicros = BigInt(0),
    transactionTime: string | null = null,
    closed = false;
  const clock = () => {
    let micros = BigInt(
      Math.trunc((performance.timeOrigin + performance.now()) * 1000),
    );
    if (micros <= lastMicros) micros = lastMicros + BigInt(1);
    lastMicros = micros;
    const iso = new Date(Number(micros / BigInt(1000))).toISOString();
    return (
      iso.slice(0, 19) +
      "." +
      (micros % BigInt(1000000)).toString().padStart(6, "0") +
      "Z"
    );
  };
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object")
      return (
        "{" +
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => JSON.stringify(key) + ":" + canonical(item))
          .join(",") +
        "}"
      );
    return JSON.stringify(value);
  };
  native.function("shish_json_equal", { deterministic: true }, (a, b) =>
    canonical(JSON.parse(String(a))) === canonical(JSON.parse(String(b)))
      ? 1
      : 0,
  );
  native.function("now", () => transactionTime ?? clock());
  native.function("clock_timestamp", clock);
  native.function("shish_timestamp", { deterministic: true }, (value) =>
    value === null ? null : timestamp(value),
  );
  native.function("shish_uint", { deterministic: true }, (value) =>
    /^\d+$/.test(String(value)) ? 1 : 0,
  );
  native.function(
    "shish_add_time",
    { deterministic: true },
    (base, interval) => {
      const match = /^(-?\d+(?:\.\d+)?) (seconds?|minutes?|hours?|days?)$/.exec(
        String(interval),
      );
      if (!match) throw new Error("Unsupported interval");
      const scale = match[2].startsWith("second")
        ? 1000
        : match[2].startsWith("minute")
          ? 60000
          : match[2].startsWith("hour")
            ? 3600000
            : 86400000;
      return timestamp(
        new Date(
          new Date(String(base)).getTime() + Number(match[1]) * scale,
        ).toISOString(),
      );
    },
  );
  native.function("date_trunc", { deterministic: true }, (unit, value) => {
    if (unit !== "minute") throw new Error("Unsupported time bucket");
    const date = new Date(String(value));
    date.setUTCSeconds(0, 0);
    return timestamp(date.toISOString());
  });
  native.function(
    "shish_elapsed_ms",
    (value) => Date.now() - new Date(String(value)).getTime(),
  );
  native.function("shish_tehran_day", { deterministic: true }, (value) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(String(value))),
  );
  let tail: Promise<void> = Promise.resolve();
  async function acquire() {
    const prior = tail;
    let release!: () => void;
    tail = new Promise<void>((done) => {
      release = done;
    });
    await prior;
    if (closed) {
      release();
      throw new Error("SQLite connection closed");
    }
    return release;
  }
  function execute(
    source: string,
    values: unknown[] = [],
    inTransaction = false,
  ): QueryResult {
    const text = sqliteSql(source, inTransaction),
      statement = native.prepare(text);
    statement.setAllowBareNamedParameters(false);
    statement.setAllowUnknownNamedParameters(false);
    const bindings: Record<string, SQLInputValue> = {};
    const boundValues =
      text === "SELECT 1" &&
      source.toLowerCase().includes("pg_advisory_xact_lock")
        ? []
        : values;
    boundValues.forEach((value, index) => {
      bindings[`$${index + 1}`] = parameter(value);
    });
    const columns = statement.columns();
    if (!columns.length) {
      const result = statement.run(bindings);
      return { rows: [], rowCount: Number(result.changes) };
    }
    const booleanAliases = new Set(
      Array.from(
        source.matchAll(/\bIS(?:\s+NOT)?\s+NULL\s+AS\s+(\w+)/gi),
        (match) => match[1],
      ),
    );
    const rows = statement.all(bindings).map((raw) => {
      const row = { ...raw } as Record<string, unknown>;
      for (const column of columns) {
        const value = row[column.name];
        const type = column.type?.toUpperCase();
        if (value === null) continue;
        if (type === "BOOLEAN" || booleanAliases.has(column.name))
          row[column.name] = Boolean(value);
        else if (type === "JSON") row[column.name] = JSON.parse(String(value));
        else if (type === "TIMESTAMPTZ")
          row[column.name] = new Date(String(value));
        else if (type === "NUMERIC") row[column.name] = String(value);
        else if (
          !type &&
          /\bcount\s*\(/i.test(source) &&
          /^(count|count\(\*\))$/i.test(column.name) &&
          !source.includes("::int")
        )
          row[column.name] = String(value);
        if (column.name.toLowerCase() === "count(*)") {
          row.count = String(value);
          delete row[column.name];
        }
      }
      return row;
    });
    return { rows, rowCount: rows.length };
  }
  async function connect(): Promise<Connection> {
    const unlock = await acquire();
    let active = false,
      failed = false,
      released = false;
    return {
      async query(source, values = []) {
        if (released) throw new Error("Released SQLite connection");
        if (/^\s*ROLLBACK\s*;?$/i.test(source)) {
          if (active) native.exec("ROLLBACK");
          active = false;
          failed = false;
          transactionTime = null;
          return { rows: [], rowCount: null };
        }
        if (failed)
          throw Object.assign(
            new Error("Transaction is aborted; rollback required"),
            { code: "25P02" },
          );
        try {
          if (/^\s*BEGIN(?: IMMEDIATE)?\s*;?$/i.test(source)) {
            native.exec("BEGIN IMMEDIATE");
            active = true;
            transactionTime = clock();
            return { rows: [], rowCount: null };
          }
          if (/^\s*COMMIT\s*;?$/i.test(source)) {
            native.exec("COMMIT");
            active = false;
            transactionTime = null;
            return { rows: [], rowCount: null };
          }
          return execute(source, values, active);
        } catch (error) {
          if (active) failed = true;
          throw dbError(error);
        }
      },
      async execScript(source) {
        if (!active) throw new Error("Migration script requires a transaction");
        try {
          native.exec(source);
        } catch (error) {
          failed = true;
          throw dbError(error);
        }
      },
      release() {
        if (released) return;
        try {
          if (active) native.exec("ROLLBACK");
        } finally {
          released = true;
          transactionTime = null;
          unlock();
        }
      },
    };
  }
  const pool: DataPool = {
    connect,
    async query(text, values) {
      const client = await connect();
      try {
        return await client.query(text, values);
      } finally {
        client.release();
      }
    },
    async end() {
      const release = await acquire();
      try {
        native.close();
        closed = true;
      } finally {
        release();
      }
    },
  };
  const db: DataStore = {
    async execute(query) {
      const built = dialect.sqlToQuery(query);
      return pool.query(built.sql, built.params);
    },
    async transaction(action) {
      const client = await connect();
      try {
        await client.query("BEGIN");
        const value = await action({
          execute: (query) => {
            const built = dialect.sqlToQuery(query);
            return client.query(built.sql, built.params);
          },
        });
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  return { pool, db };
}
