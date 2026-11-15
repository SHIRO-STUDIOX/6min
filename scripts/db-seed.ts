import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, pool } from "../lib/server/db";
import { publicQuestionSchema } from "../lib/contracts/content";

const samples = [
  {
    title: "Begrüßung",
    words: [
      ["Hallo", "سلام"],
      ["Tschüss", "خداحافظ"],
    ],
    sentences: [
      ["Guten", "Morgen"],
      ["Hallo", "Anna"],
    ],
  },
  {
    title: "Sich vorstellen",
    words: [
      ["Name", "نام"],
      ["ich", "من"],
    ],
    sentences: [
      ["Ich", "heiße", "Anna"],
      ["Ich", "bin", "Ali"],
    ],
  },
  {
    title: "Zahlen",
    words: [
      ["eins", "یک"],
      ["zwei", "دو"],
    ],
    sentences: [
      ["Das", "ist", "eins"],
      ["Das", "ist", "zwei"],
    ],
  },
];

async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.SHISH_DEMO_MODE !== "1" ||
    !["development", "test"].includes(process.env.SHISH_ENV ?? "")
  ) {
    throw new Error(
      "DEMO_ONLY seed is restricted to explicit development/test environments",
    );
  }
  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`INSERT INTO courses(id,title) VALUES ('shish-de-60','شیش — آلمانی (DEMO_ONLY)') ON CONFLICT(id) DO NOTHING`,
      );
      for (let number = 1; number <= 60; number++) {
        const id = `de-${String(number).padStart(2, "0")}`;
        const sample = samples[number - 1];
        const title = sample
          ? `${sample.title} (DEMO_ONLY)`
          : `درس ${number} — محتوا آماده نیست`;
        await tx.execute(
          sql`INSERT INTO lessons(id,course_id,sequence_number,short_title) VALUES (${id},'shish-de-60',${number},${title}) ON CONFLICT(id) DO NOTHING`,
        );
        if (!sample) continue;
        const revisionId = `${id}-v1`;
        const hash = createHash("sha256")
          .update(JSON.stringify(sample))
          .digest("hex");
        const existing = await tx.execute(
          sql`SELECT content_hash FROM lesson_revisions WHERE id=${revisionId}`,
        );
        if (existing.rows.length) {
          if (existing.rows[0].content_hash !== hash)
            throw new Error("Fixture changed: create a new revision instead");
          continue;
        }
        await tx.execute(sql`INSERT INTO lesson_revisions(id,lesson_id,version,video_asset_id,video_url,duration_ms,video_weight,unlock_threshold,content_hash,demo_only)
          VALUES (${revisionId},${id},1,${`${id}-video`},'/demo/synthetic.mp4',10000,20,70,${hash},true)`);
        const kinds = ["video", "vocabulary-match", "grammar-order"];
        for (let order = 0; order < kinds.length; order++) {
          const kind = kinds[order];
          const stageId = `${id}-${order}`;
          await tx.execute(
            sql`INSERT INTO stages(id,revision_id,stage_order,kind,exercise_type) VALUES (${stageId},${revisionId},${order},${order === 0 ? "video" : "exercise"},${order === 0 ? null : kind})`,
          );
          if (order === 0) continue;
          for (let q = 0; q < 2; q++) {
            const options =
              order === 1
                ? sample.words.map((word, i) => ({
                    id: `option-${i}`,
                    text: word[1],
                  }))
                : sample.sentences[q]
                    .map((word, i) => ({ id: `token-${i}`, text: word }))
                    .reverse();
            const config = publicQuestionSchema.parse({
              prompt: order === 1 ? sample.words[q][0] : "Ordne den Satz.",
              options,
            });
            const answerKey =
              order === 1
                ? { choiceId: `option-${q}` }
                : { tokenIds: sample.sentences[q].map((_, i) => `token-${i}`) };
            await tx.execute(sql`INSERT INTO questions(id,revision,stage_id,stable_order,public_config,answer_key,grading_kind)
              VALUES (${`${stageId}-q${q}`},1,${stageId},${q},${JSON.stringify(config)}::jsonb,${JSON.stringify(answerKey)}::jsonb,${kind})`);
          }
        }
        const validation = await tx.execute(
          sql`SELECT s.stage_order,s.kind,count(q.id)::int AS questions FROM stages s LEFT JOIN questions q ON q.stage_id=s.id WHERE s.revision_id=${revisionId} GROUP BY s.stage_order,s.kind ORDER BY s.stage_order`,
        );
        if (
          validation.rows.length !== 3 ||
          validation.rows.some(
            (stage, index) =>
              stage.stage_order !== index ||
              (index > 0 && Number(stage.questions) === 0),
          )
        )
          throw new Error("Invalid fixture publication");
        await tx.execute(
          sql`UPDATE lesson_revisions SET published_at=now() WHERE id=${revisionId}`,
        );
        await tx.execute(
          sql`UPDATE lessons SET published=true,current_revision_id=${revisionId},short_title=${title} WHERE id=${id}`,
        );
      }
    });
    console.log(
      "DEMO_ONLY: 60 metadata slots, 3 synthetic published lessons; 57 remain unavailable.",
    );
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    "Seed failed: check demo opt-in, database readiness and immutable fixture revisions.",
  );
  process.exitCode = 1;
});
