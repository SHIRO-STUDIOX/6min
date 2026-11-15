import { randomInt, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
const origin = "http://localhost:6106";
const post = (
  page: Page,
  path: string,
  data: unknown,
  key?: string,
  scope?: string,
) =>
  page.request.post(`/api/v1${path}`, {
    headers: {
      Origin: origin,
      ...(key ? { "Idempotency-Key": key } : {}),
      ...(scope ? { "X-Expected-Subject": scope } : {}),
    },
    data,
  });
async function signup(page: Page) {
  const data = (
    await (
      await post(page, "/auth/otp/request", {
        phone: "+999" + randomInt(100000000, 999999999),
        purpose: "login",
      })
    ).json()
  ).data;
  expect(
    (
      await post(page, "/auth/otp/verify", {
        challengeId: data.challengeId,
        code: "000000",
      })
    ).status(),
  ).toBe(200);
}
test("S11 guest completes all three sample lessons with actual media and cannot forge paid access", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (let number = 1; number <= 3; number++) {
    const id = `de-0${number}`;
    await page.goto(`/classroom/${id}`);
    await expect(page.getByTestId("video-status")).toContainText(
      "ثبت مشاهده فعال است",
    );
    await page.locator("video").evaluate((el: HTMLVideoElement) => el.play());
    await expect(page.getByTestId("video-status")).toContainText(
      "مشاهده تأیید شد",
      { timeout: 20000 },
    );
    const lesson = (
      await (await page.request.get(`/api/v1/lessons/${id}`)).json()
    ).data;
    for (const stage of lesson.stages.filter(
      (s: { kind: string }) => s.kind === "exercise",
    )) {
      const answers = stage.questions.map(
        (
          q: { id: string; revision: number; options: { id: string }[] },
          i: number,
        ) => ({
          questionId: q.id,
          revision: q.revision,
          response:
            stage.exerciseKind === "vocabulary-match"
              ? { choiceId: `option-${i}` }
              : { tokenIds: q.options.map((o) => o.id).sort() },
        }),
      );
      expect(
        (
          await post(
            page,
            "/attempts",
            {
              lessonId: id,
              revisionId: lesson.currentRevisionId,
              stageId: stage.id,
              kind: "full",
              completed: true,
              answers,
            },
            randomUUID(),
          )
        ).status(),
      ).toBe(200);
    }
  }
  const progress = (
    await (await page.request.get("/api/v1/me/progress")).json()
  ).data;
  expect(progress.currentLesson).toBe("de-04");
  expect(
    progress.lessons.slice(0, 3).map((l: { score: number }) => l.score),
  ).toEqual([100, 100, 100]);
  expect(progress.lessons[3].access.commercial).toBe(false);
  const denied = await page.request.get("/api/v1/lessons/de-04?entitled=true");
  expect(denied.status()).toBe(404);
  expect((await denied.json()).error.code).toBe("CONTENT_UNAVAILABLE");
  expect(
    (
      await post(page, "/checkout", { productId: "shish-de-60" }, randomUUID())
    ).status(),
  ).toBe(401);
  await page.goto("/path");
  await expect(
    page.getByTestId("path-list").locator('[aria-current="step"]'),
  ).toContainText("درس 4");
});
test("S11 expired session recovers exact intent and raw draft without accepting attempts during expiry", async ({
  page,
  context,
}) => {
  test.setTimeout(45000);
  await signup(page);
  await page.goto("/classroom/de-01");
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  await page.locator("video").evaluate((el: HTMLVideoElement) => el.play());
  await expect(page.getByTestId("video-status")).toContainText(
    "مشاهده تأیید شد",
    { timeout: 20000 },
  );
  await page
    .getByRole("navigation", { name: "نشانگر مراحل کلاس درس" })
    .getByRole("button")
    .nth(1)
    .click();
  await page.getByRole("button", { name: "Hallo", exact: true }).click();
  await page.getByRole("button", { name: "سلام", exact: true }).click();
  await expect(
    page.getByText("پیش‌نویس در حساب ذخیره شد.", { exact: true }),
  ).toBeVisible();
  const cookies = await context.cookies();
  const cookie = cookies.find((c) => c.name === "shish_session")!;
  await context.addCookies([{ ...cookie, value: "0".repeat(64) }]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "ورود و ادامه کلاس", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ورود و ادامه کلاس", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/auth" &&
      url.searchParams.get("returnTo") === "/classroom/de-01?stage=de-01-1",
  );
  await context.addCookies([cookie]);
  await page.goto("/classroom/de-01?stage=de-01-1");
  await expect(page.getByText(/1 از 2 پاسخ ثبت موقت/)).toBeVisible();
  await page.goto("/classroom");
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/classroom/de-01" &&
      url.searchParams.get("stage") === "de-01-1",
  );
});
test("S11 stale tab cannot write into changed account; account logout broadcasts to other tab", async ({
  page,
  context,
}) => {
  await page.goto("/path");
  await expect(page.getByTestId("path-list").locator("article")).toHaveCount(
    60,
  );
  const old = (await (await page.request.get("/api/v1/me/progress")).json())
    .data.subject.id;
  await signup(page);
  expect(
    (
      await post(
        page,
        "/context",
        {
          lessonId: "de-01",
          revisionId: "de-01-v1",
          stageId: "de-01-0",
          kind: "interaction",
        },
        undefined,
        old,
      )
    ).status(),
  ).toBe(409);
  const bad = await page.request.patch("/api/v1/me", {
    headers: { Origin: origin, "X-Expected-Subject": old },
    data: { displayName: "stale" },
  });
  expect(bad.status()).toBe(409);
  expect(
    (await (await page.request.get("/api/v1/me")).json()).data.displayName,
  ).not.toBe("stale");
  await page.goto("/profile");
  await expect(page.getByLabel("نام نمایشی", { exact: true })).toBeVisible();
  const second = await context.newPage();
  await second.goto("/profile");
  await expect(second.getByLabel("نام نمایشی", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await expect(
    second.getByText("مهمان؛ سابقه این مرورگر محفوظ است.", { exact: true }),
  ).toBeVisible();
  await second.close();
});
test("S11 keyboard, reduced motion and mobile player controls preserve selected stage", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/classroom/de-01");
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  const dots = page
    .getByRole("navigation", { name: "نشانگر مراحل کلاس درس" })
    .getByRole("button");
  await dots.nth(2).focus();
  await page.keyboard.press("Enter");
  await expect(dots.nth(2)).toHaveAttribute("aria-current", "step");
  await dots.nth(0).focus();
  await page.keyboard.press("Enter");
  expect(
    await page
      .getByTestId("action-center")
      .locator(':scope > div[dir="ltr"]')
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await page
    .locator("video")
    .dispatchEvent("pointerdown", { clientX: 200, clientY: 300, pointerId: 1 });
  await page
    .locator("video")
    .dispatchEvent("pointerup", { clientX: 20, clientY: 300, pointerId: 1 });
  await expect(dots.nth(0)).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: "بیشتر", exact: true }).click();
  await page.getByRole("button", { name: "راهنما", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "راهنما", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
for (const width of [375, 768, 1200])
  test(`S11 connected Sandbox templates render without fatal errors at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const id of [
      "my-path",
      "learner-profile",
      "mistakes",
      "checkout",
      "classroom",
    ]) {
      await page.goto(`/sandbox/preview?id=${id}`);
      await expect(page.locator("[data-brand]")).not.toBeEmpty();
      await expect(page.locator("body")).not.toContainText(
        "خطا در رندر کامپوننت",
      );
    }
    expect(errors).toEqual([]);
  });
