import { expect, test } from "@playwright/test";

test("S2 real API supplies catalog, public lesson and local media without answers", async ({
  request,
}) => {
  const catalog = await request.get("/api/v1/catalog");
  expect(catalog.status()).toBe(200);
  const { data } = await catalog.json();
  expect(data.lessons).toHaveLength(60);
  expect(
    data.lessons.filter((lesson: { published: boolean }) => lesson.published),
  ).toHaveLength(3);
  const lesson = await request.get("/api/v1/lessons/de-01");
  expect(lesson.status()).toBe(200);
  const body = await lesson.json();
  expect(body.data.stages).toHaveLength(3);
  expect(body.data.demoOnly).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(
    /answer_key|answerKey|choiceId|tokenIds/,
  );
  const media = await request.get(body.data.video.url);
  expect(media.status()).toBe(200);
  expect(media.headers()["content-type"]).toContain("video/mp4");
  expect((await request.get("/api/v1/lessons/de-04")).status()).toBe(404);
  expect((await request.get("/api/v1/lessons/de-02")).status()).toBe(403);
});
