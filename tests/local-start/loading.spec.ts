import { expect, test } from "@playwright/test";

test("start.ps1 loads guest classroom, roadmap and profile without a reload loop", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const apiFailures: string[] = [];
  let navigations = 0;

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;

    if (
      path.startsWith("/api/v1/") &&
      response.status() >= 400 &&
      !(path === "/api/v1/me" && response.status() === 401)
    )
      apiFailures.push(`${response.status()} ${path}`);
  });

  await page.goto("/");
  await page.getByRole("button", { name: "شروع درس اول", exact: true }).click();
  await expect(page).toHaveURL(/\/classroom\/de-01$/);
  await expect(page.locator('[data-testid^="stage-shell-"]')).toHaveCount(3);
  await expect(page.getByTestId("video-status")).toContainText(
    "ثبت مشاهده فعال است",
  );
  await page.waitForLoadState("networkidle");
  const settled = navigations;

  // A short observation window catches repeated HMR reloads after hydration.
  await page.waitForTimeout(3000);
  expect(navigations).toBe(settled);

  const dock = page.getByRole("navigation", { name: "ناوبری اصلی" });

  await dock.getByRole("button", { name: "مسیر من", exact: true }).click();
  await expect(
    page.getByTestId("path-list").locator("[data-lesson]"),
  ).toHaveCount(60);
  await expect(
    page.getByTestId("path-list").locator('[aria-current="step"]'),
  ).toContainText("درس 1");
  // The roadmap jumps to the current lesson and hides its dock on downward
  // scroll. Returning to the heading reveals the navigation again.
  await page
    .getByRole("heading", { name: "مسیر من", exact: true })
    .scrollIntoViewIfNeeded();
  await dock.getByRole("button", { name: "پروفایل", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "پروفایل", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("مهمان؛ سابقه این مرورگر محفوظ است."),
  ).toBeVisible();
  await dock.getByRole("button", { name: "کلاس", exact: true }).click();
  await expect(page.getByTestId("stage-shell-0")).toBeVisible();
  expect(apiFailures).toEqual([]);
  expect(errors).toEqual([]);

  // Canonicalizing the launcher must not weaken the write-origin guard.
  const rejectedOrigins: Record<string, string>[] = [
    { Origin: "http://outside.invalid" },
    {},
  ];

  for (const headers of rejectedOrigins) {
    const denied = await request.post("/api/v1/guest/bootstrap", { headers });

    expect(denied.status()).toBe(403);
    expect((await denied.json()).error.code).toBe("ORIGIN_REQUIRED");
  }
});
