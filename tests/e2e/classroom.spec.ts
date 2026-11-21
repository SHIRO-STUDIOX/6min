import { expect, test } from "@playwright/test";
import { randomInt } from "node:crypto";

test("S8 header has exactly four More actions, modal disables dock and exiting class preserves login", async ({
  page,
}) => {
  const origin = new URL(test.info().project.use.baseURL!).origin;
  const post = (path: string, data: unknown) =>
    page.request.post(`/api/v1${path}`, { headers: { Origin: origin }, data });
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
  await page.goto("/classroom/de-01");
  await expect(page.getByTestId("stage-shell-0")).toBeVisible();
  await page.getByRole("button", { name: "بیشتر", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "بیشتر", exact: true });
  await expect(menu.getByRole("button")).toHaveCount(4);
  await menu.getByRole("button", { name: "گزارش مشکل", exact: true }).click();
  await page
    .getByLabel("شرح مشکل (بدون رمز یا اطلاعات حساس)", { exact: true })
    .fill("گزارش آزمایشی رابط؛ بدون اطلاعات شخصی");
  const dock = page.locator('nav[aria-label="ناوبری اصلی"] button');
  for (let index = 0; index < 3; index++)
    await expect(dock.nth(index)).toBeDisabled();
  await page.getByRole("button", { name: "ثبت گزارش", exact: true }).click();
  await expect(
    page.getByText("گزارش شما ثبت شد.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "بستن", exact: true }).click();
  await page.getByRole("button", { name: "بیشتر", exact: true }).click();
  await page.getByRole("button", { name: "خروج از کلاس", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/path");
  expect((await page.request.get("/api/v1/me")).status()).toBe(200);
});

test("S8 onboarding enters a real lesson; locked dots navigate only the shell and Focus preserves geometry", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "شروع درس اول", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/classroom/de-01");
  const dots = page
    .getByRole("navigation", { name: "نشانگر مراحل کلاس درس" })
    .getByRole("button");
  await expect(dots).toHaveCount(3);
  await dots.nth(2).click();
  await expect(
    page.getByText(
      "فعالیت این مرحله قفل است. ابتدا پیش‌نیاز قبلی را کامل کنید.",
    ),
  ).toBeVisible();
  await expect(page.locator("video")).toHaveCount(0);
  const box = await page.getByTestId("stage-shell-2").boundingBox();
  await page.getByRole("button", { name: "حالت تمرکز", exact: true }).click();
  const focused = await page.getByTestId("stage-shell-2").boundingBox();
  // Translated layers produce subpixel bounding-box rounding in Chromium.
  expect(focused!.width).toBeCloseTo(box!.width, 2);
  expect(focused!.height).toBeCloseTo(box!.height, 2);
  await expect(
    page.getByRole("banner", { name: "ابزارهای کلاس" }),
  ).toBeVisible();
  const progress = (
    await (await page.request.get("/api/v1/me/progress")).json()
  ).data;
  expect(progress.lastActivity).toBeNull();
});

test("S8 full UI learning uses real playback and deferred FSMs, restores grammar draft and unlocks without auto-navigation", async ({
  page,
}) => {
  test.setTimeout(50000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/classroom/de-01");
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  await page
    .locator("video")
    .evaluate((element: HTMLVideoElement) => element.play());
  await expect(page.getByTestId("video-status")).toContainText(
    "مشاهده تأیید شد",
    { timeout: 20000 },
  );
  const dots = () =>
    page
      .getByRole("navigation", { name: "نشانگر مراحل کلاس درس" })
      .getByRole("button");
  await dots().nth(1).click();
  // Public option order is arbitrary. A recorded target must not disable
  // another target just because its prototype pair ID matches the source.
  const lesson = (
    await (await page.request.get("/api/v1/lessons/de-01")).json()
  ).data;
  const matching = lesson.stages.find(
    (stage: { exerciseKind: string }) =>
      stage.exerciseKind === "vocabulary-match",
  );
  const [first, second] = matching.questions;
  const [firstOption, secondOption] = first.options;
  await page.getByRole("button", { name: first.prompt, exact: true }).click();
  await page
    .getByRole("button", { name: secondOption.text, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: secondOption.text, exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: firstOption.text, exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: second.prompt, exact: true }).click();
  await page
    .getByRole("button", { name: firstOption.text, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "ثبت تلاش کامل", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("تلاش کامل ثبت شد", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "تلاش تازه از ابتدا", exact: true })
    .click();
  await page.getByRole("button", { name: "Hallo", exact: true }).click();
  await page.getByRole("button", { name: "سلام", exact: true }).click();
  await page.getByRole("button", { name: "Tschüss", exact: true }).click();
  await page.getByRole("button", { name: "خداحافظ", exact: true }).click();
  await page
    .getByRole("button", { name: "ثبت تلاش کامل", exact: true })
    .click();
  await expect(page.getByText(/نتیجه ثبت شد: 100٪/)).toBeVisible();
  await dots().nth(2).click();
  await page.getByRole("button", { name: "Guten", exact: true }).click();
  await expect(
    page.getByText("پیش‌نویس محلی ذخیره شد؛ بدون امتیاز."),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "حذف Guten", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Morgen", exact: true }).click();
  await page
    .getByRole("button", { name: "ثبت موقت این پاسخ", exact: true })
    .click();
  await page.getByRole("button", { name: "Hallo", exact: true }).click();
  await page.getByRole("button", { name: "Anna", exact: true }).click();
  await page
    .getByRole("button", { name: "ثبت موقت این پاسخ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ثبت تلاش کامل", exact: true })
    .click();
  await expect(
    page.getByText("درس بعدی باز شد.", { exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/classroom/de-01");
  const progress = (
    await (await page.request.get("/api/v1/me/progress")).json()
  ).data;
  expect(progress.currentLesson).toBe("de-02");
  expect(errors).toEqual([]);
});

test("S8 pointer drag advances one stage, vertical wheel is native and dock keeps physical order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 });
  await page.goto("/classroom/de-01");
  const stage = page.getByTestId("stage-shell-0");
  await expect(stage).toBeVisible();
  const header = stage.getByRole("heading", {
    name: "ویدیوی درس",
    exact: true,
  });
  const box = await header.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + 12);
  await page.mouse.down();
  await page.mouse.move(box!.x - 200, box!.y + 12, { steps: 8 });
  await page.mouse.up();
  const dots = page
    .getByRole("navigation", { name: "نشانگر مراحل کلاس درس" })
    .getByRole("button");
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "step");
  await page.mouse.move(180, 300);
  await page.mouse.wheel(0, 200);
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "step");
  await expect
    .poll(() =>
      page
        .locator("[data-app-scroll]")
        .evaluateAll((nodes) =>
          nodes.reduce((sum, node) => sum + node.scrollTop, 0),
        ),
    )
    .toBeGreaterThan(0);
  await page.locator("[data-app-scroll]").evaluateAll((nodes) =>
    nodes.forEach((node) => {
      node.scrollTop = 0;
    }),
  );
  const nav = page.getByRole("navigation", { name: "ناوبری اصلی" });
  const left = nav.getByRole("button", { name: "مسیر من", exact: true });
  await expect(left).toBeEnabled();
  const center = await nav
    .getByRole("button", { name: "کلاس", exact: true })
    .boundingBox();
  const right = await nav
    .getByRole("button", { name: "پروفایل", exact: true })
    .boundingBox();
  expect((await left.boundingBox())!.x).toBeLessThan(center!.x);
  expect(center!.x).toBeLessThan(right!.x);
  await left.click();
  await expect(
    page.getByRole("heading", { name: "مسیر من", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(dots.nth(1)).toHaveAttribute("aria-current", "step");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
