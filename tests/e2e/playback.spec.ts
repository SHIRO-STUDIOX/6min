import { expect, test } from "@playwright/test";

test("S4 native package renders in isolated Sandbox without persistence", async ({
  page,
}) => {
  await page.goto("/sandbox/preview?id=lesson-video");
  await expect(page.getByTestId("video-status")).toContainText(
    "پیش‌نمایش محلی",
  );
  await expect(page.locator("video")).toBeVisible();
});
test("S4 actual media playback earns durable unique coverage and resumes on refresh", async ({
  page,
}) => {
  await page.goto("/dev/playback");
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  const video = page.locator("video");
  await expect(video).toBeVisible();
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect(page.getByTestId("video-status")).toContainText(
    "مشاهده تأیید شد",
    { timeout: 20000 },
  );
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  await page.reload();
  await expect(page.getByTestId("video-status")).toContainText(
    "مشاهده تأیید شد",
  );
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(7);
});
test("S4 seek to end without play never creates credit", async ({ page }) => {
  await page.goto("/dev/playback");
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  const video = page.locator("video");
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.readyState),
    )
    .toBeGreaterThan(0);
  await video.evaluate((element: HTMLVideoElement) => {
    element.currentTime = 9.9;
  });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(9);
  await expect(page.getByTestId("video-status")).toContainText("0٪");
  await expect(page.getByTestId("video-status")).not.toContainText(
    "مشاهده تأیید شد",
  );
});
