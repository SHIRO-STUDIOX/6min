import { randomInt, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
test("S9 My Path is reversed, locks expand in place, jump only scrolls and restores position", async ({
  page,
}) => {
  await page.goto("/path");
  const list = page.getByTestId("path-list");
  await expect(list.locator("article")).toHaveCount(60);
  expect(
    await list.locator("article").first().getAttribute("data-lesson"),
  ).toBe("de-60");
  expect(await list.locator("article").last().getAttribute("data-lesson")).toBe(
    "de-01",
  );
  await page
    .getByRole("button", { name: "پرش به درس 50", exact: true })
    .click();
  await expect(list.locator('[data-lesson="de-50"]')).toBeInViewport();
  expect(new URL(page.url()).pathname).toBe("/path");
  await list.locator('[data-lesson="de-50"] button').first().click();
  await expect(list.locator('[data-lesson="de-50"]')).toContainText(
    "پیش‌نیاز: تکمیل درس 49",
  );
  expect(new URL(page.url()).pathname).toBe("/path");
  const position = await list.evaluate((el) => el.scrollTop);
  await page.reload();
  await expect(list.locator("article")).toHaveCount(60);
  await expect
    .poll(() => list.evaluate((el) => el.scrollTop))
    .toBeCloseTo(position, -1);
  await page
    .getByRole("button", { name: "برو به درس من", exact: true })
    .click();
  await list.locator('[data-lesson="de-01"] button').first().click();
  await expect(page).toHaveURL((url) => url.pathname === "/classroom/de-01");
});
test("S9 profile persists name and private avatar; malformed upload preserves it", async ({
  page,
}) => {
  const post = (path: string, data: unknown) =>
    page.request.post(`/api/v1${path}`, {
      headers: { Origin: "http://localhost:6106" },
      data,
    });
  const issued = (
    await (
      await post("/auth/otp/request", {
        phone: "+999" + randomInt(100000000, 999999999),
        purpose: "login",
      })
    ).json()
  ).data;
  expect(
    (
      await post("/auth/otp/verify", {
        challengeId: issued.challengeId,
        code: "000000",
      })
    ).status(),
  ).toBe(200);
  await page.goto("/profile");
  await page.getByLabel("نام نمایشی", { exact: true }).fill("نام پایدار");
  await page.getByRole("button", { name: "ذخیره نام", exact: true }).click();
  await expect(page.getByText("نام ذخیره شد.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("نام نمایشی", { exact: true })).toHaveValue(
    "نام پایدار",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5hQAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "tiny.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByText("تصویر ذخیره شد.", { exact: true }),
  ).toBeVisible();
  const image = page.getByAltText("تصویر پروفایل");
  await expect(image).toBeVisible();
  const src = await image.getAttribute("src");
  await page.reload();
  await expect(page.getByAltText("تصویر پروفایل")).toHaveAttribute("src", src!);
  await page.locator('input[type="file"]').setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("bad"),
  });
  await expect(
    page.getByRole("alert").filter({ hasText: "تصویر معتبر" }),
  ).toBeVisible();
  await expect(page.getByAltText("تصویر پروفایل")).toHaveAttribute("src", src!);
  await page
    .getByRole("button", { name: "برداشتن تصویر", exact: true })
    .click();
  await expect(page.getByAltText("تصویر پروفایل")).toHaveCount(0);
});
test("S9 wrong-only UI review has explicit continue/back and original exercise return", async ({
  page,
}) => {
  test.setTimeout(40000);
  await page.goto("/classroom/de-01");
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  await page.locator("video").evaluate((el: HTMLVideoElement) => el.play());
  await expect(page.getByTestId("video-status")).toContainText(
    "مشاهده تأیید شد",
    { timeout: 20000 },
  );
  const response = await page.request.post("/api/v1/attempts", {
    headers: {
      Origin: "http://localhost:6106",
      "Idempotency-Key": randomUUID(),
    },
    data: {
      lessonId: "de-01",
      revisionId: "de-01-v1",
      stageId: "de-01-1",
      kind: "full",
      completed: true,
      answers: [0, 1].map((i) => ({
        questionId: `de-01-1-q${i}`,
        revision: 1,
        response: { choiceId: "wrong" },
      })),
    },
  });
  expect(response.status()).toBe(200);
  await page.goto(
    "/mistakes?returnTo=" +
      encodeURIComponent("/classroom/de-01?stage=de-01-1"),
  );
  await expect(
    page.getByRole("button", { name: "مرور این سؤال", exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "مرور این سؤال", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "خداحافظ", exact: true }).click();
  await page
    .getByRole("button", { name: "ثبت پاسخ مرور", exact: true })
    .click();
  await expect(
    page.getByText("پاسخ درست ثبت شد.", { exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/mistakes");
  await page.getByRole("button", { name: "ادامه مرور", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "مرور این سؤال", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "رفتن به تمرین اصلی", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "بازگشت به مرور اشتباهات", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "بازگشت به مرور اشتباهات", exact: true })
    .click();
  await page
    .getByRole("button", { name: "بازگشت به محل قبلی", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/classroom/de-01" &&
      url.searchParams.get("stage") === "de-01-1",
  );
});
