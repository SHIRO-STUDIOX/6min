import {
  mkdtempSync,
  rmSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  linkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { sqliteDatabase } from "../../lib/server/database/sqlite";
import { databaseConfig } from "../../lib/server/database/config";
import { sqliteSql } from "../../lib/server/database/sqlite-sql";
import {
  localSqlitePath,
  sameSqliteFile,
} from "../../lib/server/database/local-sqlite-path.mjs";
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
async function database() {
  const folder = mkdtempSync(join(tmpdir(), "shish-sqlite-"));
  const result = sqliteDatabase(join(folder, "test.sqlite"));
  cleanups.push(async () => {
    await result.pool.end();
    rmSync(folder, { recursive: true, force: true });
  });
  const client = await result.pool.connect();
  try {
    await client.query("BEGIN");
    await client.execScript(
      readFileSync("db/sqlite/migrations/0001_mvp.sql", "utf8"),
    );
    await client.query("COMMIT");
  } finally {
    client.release();
  }
  return result;
}
it("requires PostgreSQL for Production and restricts SQLite to an explicit local path", () => {
  expect(
    databaseConfig({
      SHISH_ENV: "production",
      DATABASE_URL: "postgresql://localhost/db",
    }).driver,
  ).toBe("postgres");
  for (const env of [
    {
      SHISH_ENV: "production",
      DATABASE_URL: "sqlite:./.local-data/dev.sqlite",
    },
    { SHISH_ENV: undefined, DATABASE_URL: "sqlite:./.local-data/dev.sqlite" },
    { SHISH_ENV: "development", DATABASE_URL: "sqlite:../outside.sqlite" },
    {
      SHISH_ENV: "development",
      SHISH_DB_DRIVER: "postgres",
      DATABASE_URL: "sqlite:./.local-data/dev.sqlite",
    },
  ])
    expect(() => databaseConfig(env)).toThrow();
  expect(
    databaseConfig({
      SHISH_ENV: "development",
      SHISH_DB_DRIVER: "sqlite",
      DATABASE_URL: "sqlite:./.local-data/dev.sqlite",
    }).driver,
  ).toBe("sqlite");
});
it("uses real BEGIN IMMEDIATE instead of erasing lock requirements outside transactions", () => {
  expect(() =>
    sqliteSql("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", false),
  ).toThrow();
  expect(() => sqliteSql("SELECT * FROM users FOR UPDATE", false)).toThrow();
  expect(sqliteSql("SELECT * FROM users FOR UPDATE", true)).not.toContain(
    "FOR UPDATE",
  );
  expect(() => sqliteSql("SELECT $1::unsupported", true)).toThrow(
    "Unsupported SQL",
  );
});
it("preserves exact fractions, JSON/Boolean/date types, placeholders and Tehran calendar semantics", async () => {
  const { pool, db } = await database();
  const id = "json'; DROP TABLE subjects; --";
  await db.execute(sql`INSERT INTO subjects(id,kind) VALUES(${id},'guest')`);
  expect(
    (await pool.query("SELECT id FROM subjects WHERE id=$1", [id])).rows[0].id,
  ).toBe(id);
  const value = (
    await pool.query("SELECT created_at FROM subjects WHERE id=$1", [id])
  ).rows[0].created_at;
  expect(value).toBeInstanceOf(Date);
  expect(
    (
      await pool.query("SELECT shish_tehran_day($1) AS day", [
        "2026-11-15T22:00:00.000000Z",
      ])
    ).rows[0].day,
  ).toBe("2026-11-16");
  await pool.query("INSERT INTO courses(id,title) VALUES('course','test')");
  await pool.query(
    "INSERT INTO lessons(id,course_id,sequence_number,short_title) VALUES('lesson','course',1,'test')",
  );
  const numerator = "9".repeat(180),
    denominator = "1" + "0".repeat(180);
  await pool.query(
    "INSERT INTO lesson_progress(subject_id,lesson_id,earned_n,earned_d) VALUES($1,'lesson',$2,$3)",
    [id, numerator, denominator],
  );
  expect(
    (
      await pool.query(
        "SELECT earned_n,earned_d,video_credited FROM lesson_progress WHERE subject_id=$1",
        [id],
      )
    ).rows[0],
  ).toEqual({
    earned_n: numerator,
    earned_d: denominator,
    video_credited: false,
  });
  expect(
    (
      await pool.query("SELECT shish_json_equal($1,$2) AS equal", [
        '{"b":2,"a":[1,true]}',
        '{"a":[1,true],"b":2}',
      ])
    ).rows[0].equal,
  ).toBe(1);
});
it("does not allow a caught constraint error to commit partial history, and queues outside reads", async () => {
  const { pool, db } = await database();
  await expect(
    db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO subjects(id,kind) VALUES('atomic','guest')`,
      );
      try {
        await tx.execute(
          sql`INSERT INTO subjects(id,kind) VALUES('atomic','guest')`,
        );
      } catch {}
      await tx.execute(sql`SELECT id FROM subjects`);
    }),
  ).rejects.toMatchObject({ code: "25P02" });
  expect(
    (await pool.query("SELECT id FROM subjects WHERE id='atomic'")).rowCount,
  ).toBe(0);
  let allow!: () => void;
  const gate = new Promise<void>((done) => {
    allow = done;
  });
  let entered!: () => void;
  const started = new Promise<void>((done) => {
    entered = done;
  });
  const transaction = db.transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO subjects(id,kind) VALUES('queued','guest')`,
    );
    entered();
    await gate;
  });
  await started;
  const read = pool.query("SELECT id FROM subjects WHERE id='queued'");
  allow();
  await transaction;
  expect((await read).rows).toEqual([{ id: "queued" }]);
});

it("rejects symlink/junction paths and recognizes Windows case aliases and hard links", () => {
  const folder = mkdtempSync(join(tmpdir(), "shish-sqlite-path-"));
  cleanups.push(async () => {
    rmSync(folder, { recursive: true, force: true });
  });
  const root = join(folder, ".local-data"),
    outside = join(folder, "elsewhere");
  mkdirSync(root);
  mkdirSync(outside);
  symlinkSync(
    outside,
    join(root, "alias"),
    process.platform === "win32" ? "junction" : "dir",
  );
  expect(() =>
    localSqlitePath("sqlite:./.local-data/alias/dev.sqlite", folder),
  ).toThrow("symbolic links");
  expect(
    sameSqliteFile(join(root, "dev.sqlite"), join(root, "DEV.sqlite"), true),
  ).toBe(true);
  const file = join(root, "a.sqlite"),
    alias = join(root, "b.sqlite");
  writeFileSync(file, "");
  linkSync(file, alias);
  expect(sameSqliteFile(file, alias)).toBe(true);
});
