import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("S5 real HTTP journey: video, full attempts, wrong-only review and stable unlock", async ({ page }) => {
  test.setTimeout(40000);
  await page.goto("/dev/playback");
  await expect(page.getByTestId("video-status")).toContainText("ثبت مشاهده فعال است");
  await page.locator("video").evaluate((element: HTMLVideoElement) => element.play());
  await expect(page.getByTestId("video-status")).toContainText("مشاهده تأیید شد", { timeout: 20000 });
  await page.locator("video").evaluate((element: HTMLVideoElement) => element.pause());
  const send = async (body: unknown) => {
    const response = await page.request.post("/api/v1/attempts", { headers: { Origin: "http://localhost:6106", "Idempotency-Key": randomUUID() }, data: body });
    expect(response.status()).toBe(200);
    return (await response.json()).data;
  };
  const wrong = { lessonId: "de-01", revisionId: "de-01-v1", stageId: "de-01-1", kind: "full", completed: true,
    answers: [0, 1].map((index) => ({ questionId: `de-01-1-q${index}`, revision: 1, response: { choiceId: "wrong" } })) };
  expect((await send(wrong)).lessonScore).toBe(20);
  const grammar = { ...wrong, stageId: "de-01-2", answers: [0, 1].map((index) => ({ questionId: `de-01-2-q${index}`, revision: 1, response: { tokenIds: ["token-0", "token-1"] } })) };
  expect((await send(grammar)).lessonScore).toBe(60);
  const list = await page.request.get("/api/v1/mistakes");
  expect(list.status()).toBe(200); expect((await list.json()).data.items).toHaveLength(2);
  const review = await page.request.post("/api/v1/mistakes/review-sessions", { headers: { Origin: "http://localhost:6106" }, data: { questionRefs: [{ id: "de-01-1-q0", revision: 1 }] } });
  expect(review.status()).toBe(200); expect((await review.json()).data.items).toHaveLength(1);
  const corrected = await send({ ...wrong, kind: "review", answers: [{ questionId: "de-01-1-q0", revision: 1, response: { choiceId: "option-0" } }] });
  expect(corrected.lessonScore).toBe(80); expect(corrected.unlockEvent).toEqual({ lessonId: "de-02" });
  const weaker = await send(wrong);
  expect(weaker.lessonScore).toBe(80); expect(weaker.unlockEvent).toBeNull();
});
