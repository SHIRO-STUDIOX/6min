import { randomInt } from "node:crypto";
import { expect, test } from "@playwright/test";

const origin = "http://localhost:6106";

test("S7 interrupted import retains authenticated session and retries without a new OTP", async ({
  page,
}) => {
  const post = (path: string, data: unknown) =>
    page.request.post(`/api/v1${path}`, { headers: { Origin: origin }, data });
  await post("/guest/bootstrap", {});
  const watch = (
    await (
      await post("/video/watch-sessions", {
        lessonId: "de-01",
        revisionId: "de-01-v1",
        videoAssetId: "de-01-video",
      })
    ).json()
  ).data;
  await page.request.patch(
    `/api/v1/video/watch-sessions/${watch.watchSessionId}`,
    {
      headers: { Origin: origin },
      data: { sequence: 1, playedIntervals: [], lastPositionMs: 1000 },
    },
  );
  let interrupted = false;
  await page.route("**/api/v1/guest/import", async (route) => {
    if (route.request().method() === "POST" && !interrupted) {
      interrupted = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.goto("/auth?returnTo=/sandbox");
  await page
    .locator("#phone-input")
    .fill("09" + randomInt(100000000, 999999999));
  await page
    .getByRole("button", { name: "دریافت کد تأیید", exact: true })
    .click();
  await page.getByLabel("کد تأیید", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "تأیید کد", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "داده" }),
  ).toBeVisible();
  expect((await page.request.get("/api/v1/me")).status()).toBe(200);
  await page
    .getByRole("button", { name: "تلاش دوباره برای انتقال", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/sandbox");
  expect(interrupted).toBe(true);
  expect(
    (await (await page.request.get("/api/v1/guest/import")).json()).data
      .watchCount,
  ).toBe(0);
});

test("S7 existing-account consent can be declined without mutation, then explicitly accepted", async ({
  page,
}) => {
  const phone = "+999" + randomInt(100000000, 999999999);
  const post = (path: string, data: unknown) =>
    page.request.post(`/api/v1${path}`, { headers: { Origin: origin }, data });
  const challenge = (
    await (await post("/auth/otp/request", { phone, purpose: "login" })).json()
  ).data;
  expect(
    (
      await post("/auth/otp/verify", {
        challengeId: challenge.challengeId,
        code: "000000",
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post("/auth/password/set", {
        password: "consent-browser-test-password",
      })
    ).status(),
  ).toBe(200);
  await post("/auth/logout", {});
  const watch = (
    await (
      await post("/video/watch-sessions", {
        lessonId: "de-01",
        revisionId: "de-01-v1",
        videoAssetId: "de-01-video",
      })
    ).json()
  ).data;
  expect(
    (
      await page.request.patch(
        `/api/v1/video/watch-sessions/${watch.watchSessionId}`,
        {
          headers: { Origin: origin },
          data: { sequence: 1, playedIntervals: [], lastPositionMs: 1000 },
        },
      )
    ).status(),
  ).toBe(200);
  const login = async () => {
    await page.goto("/auth?returnTo=/sandbox");
    await page
      .getByRole("button", { name: "ورود با رمز", exact: true })
      .click();
    await page.getByLabel("شماره موبایل", { exact: true }).fill(phone);
    await page
      .getByLabel("رمز عبور", { exact: true })
      .fill("consent-browser-test-password");
    await page
      .locator("form")
      .getByRole("button", { name: "ورود با رمز", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "خیر، ادامه بدون ادغام", exact: true }),
    ).toBeVisible();
  };
  await login();
  await page
    .getByRole("button", { name: "خیر، ادامه بدون ادغام", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/sandbox");
  let preview = (await (await page.request.get("/api/v1/guest/import")).json())
    .data;
  expect(preview.watchCount).toBe(1);
  expect(preview.canAutoImport).toBe(false);
  const before = (await (await page.request.get("/api/v1/me/progress")).json())
    .data;
  expect(
    before.lessons.find((lesson: { id: string }) => lesson.id === "de-01")
      .videoCredited,
  ).toBe(false);
  await login();
  await page
    .getByRole("button", { name: "بله، ادغام پیشرفت مهمان", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/sandbox");
  preview = (await (await page.request.get("/api/v1/guest/import")).json())
    .data;
  expect(preview.watchCount).toBe(0);
});
test("S7 phone form reuses existing UI, mock OTP creates a session, refresh rotates and logout revokes", async ({
  page,
  context,
  playwright,
}) => {
  await page.goto("/sandbox/preview?id=auth-panel");
  await expect(
    page.getByText("پیش‌نمایش Sandbox؛ هیچ ورود یا پیامی انجام نمی‌شود."),
  ).toBeVisible();
  await page.goto("/auth?returnTo=/sandbox");
  await expect(
    page.getByText(/فقط محیط توسعه: پیامک واقعی ارسال نمی‌شود/),
  ).toBeVisible();
  await page
    .locator("#phone-input")
    .fill("09" + randomInt(100000000, 999999999));
  await page
    .getByRole("button", { name: "دریافت کد تأیید", exact: true })
    .click();
  await page.getByLabel("کد تأیید", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "تأیید کد", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/sandbox");
  const me = await page.request.get("/api/v1/me");
  expect(me.status()).toBe(200);
  expect((await me.json()).data.authMode).toBe("mock");
  const oldState = await context.storageState();
  expect(
    (
      await page.request.post("/api/v1/auth/session/refresh", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(200);
  const previous = await playwright.request.newContext({
    baseURL: origin,
    storageState: oldState,
  });
  expect((await previous.get("/api/v1/me")).status()).toBe(401);
  await previous.dispose();
  expect((await page.request.get("/api/v1/me")).status()).toBe(200);
  expect(
    (
      await page.request.post("/api/v1/auth/logout", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(200);
  expect((await page.request.get("/api/v1/me")).status()).toBe(401);
});

test("S7 actual HTTP password and OTP recovery rejects old password and reused recovery grant", async ({
  request,
}) => {
  const phone = "+999" + randomInt(100000000, 999999999);
  const post = (path: string, data: unknown) =>
    request.post(`/api/v1${path}`, { headers: { Origin: origin }, data });
  const issue = await post("/auth/otp/request", { phone, purpose: "login" });
  expect(issue.status()).toBe(200);
  const issued = (await issue.json()).data;
  expect(issued).not.toHaveProperty("code");
  expect(
    (
      await post("/auth/otp/verify", {
        challengeId: issued.challengeId,
        code: "000000",
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post("/auth/password/set", {
        password: "old-browser-test-password",
      })
    ).status(),
  ).toBe(200);
  await post("/auth/logout", {});
  expect(
    (
      await post("/auth/password/login", { phone, password: "incorrect" })
    ).status(),
  ).toBe(401);
  expect(
    (
      await post("/auth/password/login", {
        phone,
        password: "old-browser-test-password",
      })
    ).status(),
  ).toBe(200);
  const challenge = (
    await (
      await post("/auth/otp/request", { phone, purpose: "recover" })
    ).json()
  ).data;
  const verified = await post("/auth/otp/verify", {
    challengeId: challenge.challengeId,
    code: "000000",
  });
  expect(verified.status()).toBe(200);
  const grant = (await verified.json()).data.recoveryGrant;
  const reset = {
    recoveryGrant: grant,
    newPassword: "new-browser-test-password",
  };
  expect((await post("/auth/password/recover", reset)).status()).toBe(200);
  expect((await post("/auth/password/recover", reset)).status()).toBe(401);
  expect(
    (
      await post("/auth/password/login", {
        phone,
        password: "old-browser-test-password",
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await post("/auth/password/login", {
        phone,
        password: "new-browser-test-password",
      })
    ).status(),
  ).toBe(200);
});

test("S7 new-account UI automatically imports owned server watch history", async ({
  page,
}) => {
  test.setTimeout(40000);
  await page.goto("/dev/playback");
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
  await page
    .locator("video")
    .evaluate((element: HTMLVideoElement) => element.pause());
  await page.goto("/auth?returnTo=/sandbox");
  await page
    .locator("#phone-input")
    .fill("09" + randomInt(100000000, 999999999));
  await page
    .getByRole("button", { name: "دریافت کد تأیید", exact: true })
    .click();
  await page.getByLabel("کد تأیید", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "تأیید کد", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/sandbox");
  const progress = (
    await (await page.request.get("/api/v1/me/progress")).json()
  ).data;
  expect(
    progress.lessons.find((lesson: { id: string }) => lesson.id === "de-01")
      .videoCredited,
  ).toBe(true);
});
