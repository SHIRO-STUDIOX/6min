import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../../lib/server/db";

afterAll(async () => {
  await pool.end();
});

describe("S1 real PostgreSQL invariants", () => {
  it("has a migrated, seeded course without publishing unfinished content", async () => {
    const result = await pool.query(
      "SELECT published FROM lessons WHERE id='de-01'",
    );
    expect(result.rows).toEqual([{ published: false }]);
  });

  it("rolls back an entire transaction on a duplicate attempt key", async () => {
    const id = randomUUID();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO subjects(id,kind) VALUES($1,'guest')", [
        id,
      ]);
      await client.query(
        "INSERT INTO lesson_revisions(id,lesson_id,version,content_hash) VALUES($1,'de-01',999999,$1)",
        [id],
      );
      await client.query(
        "INSERT INTO stages(id,revision_id,stage_order,kind) VALUES($1,$1,0,'exercise')",
        [id],
      );
      const insert =
        "INSERT INTO learning_attempts(id,subject_id,revision_id,stage_id,kind,completed,idempotency_key,request_hash,score) VALUES($1,$2,$2,$2,'full',true,'duplicate','hash',0.6)";
      await client.query(insert, [randomUUID(), id]);
      await expect(
        client.query(insert, [randomUUID(), id]),
      ).rejects.toMatchObject({ code: "23505" });
      await client.query("ROLLBACK");
      expect(
        (await client.query("SELECT id FROM subjects WHERE id=$1", [id]))
          .rowCount,
      ).toBe(0);
      expect(
        (
          await client.query(
            "SELECT id FROM learning_attempts WHERE subject_id=$1",
            [id],
          )
        ).rowCount,
      ).toBe(0);
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("enforces sequence bounds without leaving test data", async () => {
    await expect(
      pool.query(
        "INSERT INTO lessons(id,course_id,sequence_number,short_title) VALUES($1,'shish-de-60',61,'invalid')",
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
