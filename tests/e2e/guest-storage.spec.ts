import { expect, test } from "@playwright/test";

test("S6 real IndexedDB keeps an offline draft through refresh without awarding score", async ({
  page,
  context,
}) => {
  await page.goto("/sandbox/preview?id=guest-draft");
  const input = page.getByLabel("پیش‌نویس پاسخ");
  await expect(input).toBeEnabled();
  await context.setOffline(true);
  await input.fill("Guten Morgen — پیش‌نویس آفلاین");
  await expect(page.getByRole("status")).toContainText("ذخیره شد؛ بدون امتیاز");
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByLabel("پیش‌نویس پاسخ")).toHaveValue(
    "Guten Morgen — پیش‌نویس آفلاین",
  );
});

test("S6 guest proof survives refresh and cannot enable paid content via headers", async ({
  request,
}) => {
  const bootstrap = await request.post("/api/v1/guest/bootstrap", {
    headers: { Origin: "http://localhost:6106" },
  });
  expect(bootstrap.status()).toBe(200);
  const first = (await bootstrap.json()).data;
  const again = await request.post("/api/v1/guest/bootstrap", {
    headers: { Origin: "http://localhost:6106" },
  });
  expect((await again.json()).data.guestId).toBe(first.guestId);
  const progress = await request.get("/api/v1/me/progress", {
    headers: { "X-Subject-Id": "someone-else", "X-Is-Paid": "true" },
  });
  expect(progress.status()).toBe(200);
  const body = (await progress.json()).data;
  expect(body.currentLesson).toBe("de-01");
  expect(
    body.lessons.find((lesson: { id: string }) => lesson.id === "de-04").access
      .commercial,
  ).toBe(false);
});
