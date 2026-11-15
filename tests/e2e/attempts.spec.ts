import { expect, test } from "@playwright/test";

test("S3 rejects absent identity, forged grades and cross-origin writes over HTTP", async ({
  request,
}) => {
  const origin = "http://localhost:6106";
  expect((await request.post("/api/v1/guest/bootstrap")).status()).toBe(403);
  expect(
    (
      await request.post("/api/v1/attempts", {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(401);
  const bootstrap = await request.post("/api/v1/guest/bootstrap", {
    headers: { Origin: origin },
  });
  expect(bootstrap.status()).toBe(200);
  expect((await bootstrap.json()).data).toMatchObject({ kind: "guest" });
  const input = {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    kind: "full",
    completed: true,
    answers: [
      {
        questionId: "de-01-1-q0",
        revision: 1,
        response: { choiceId: "option-0" },
      },
      {
        questionId: "de-01-1-q1",
        revision: 1,
        response: { choiceId: "option-1" },
      },
    ],
  };
  const headers = { Origin: origin, "Idempotency-Key": "browser-test-key" };
  expect(
    (
      await request.post("/api/v1/attempts", {
        headers,
        data: { ...input, score: 1 },
      })
    ).status(),
  ).toBe(422);
  expect(
    (await request.post("/api/v1/attempts", { headers, data: input })).status(),
  ).toBe(403);
});
