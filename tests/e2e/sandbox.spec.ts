import { expect, test } from "@playwright/test";

const ids = ["video-card", "vocabulary-card", "grammar-card", "dictation-card", "pronunciation-card", "completion-card", "video-player", "phone-login", "floating-header", "stage-indicator"];

test("baseline Sandbox catalog filters and selects a component", async ({ page }) => {
  await page.goto("/sandbox");
  await expect(page.getByText("HeroUI Sandbox", { exact: true })).toBeVisible();
  await page.getByPlaceholder("جستجو بر اساس نام یا ویژگی...").fill("PhoneLogin");
  await page.getByText("فرم ورود با شماره موبایل (مینیمال)", { exact: true }).click();
  await expect(page.locator("#phone-input")).toBeVisible();
});

for (const id of ids) {
  test(`baseline preview renders ${id}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/sandbox/preview?id=${id}`, { waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).not.toContainText("خطا در رندر کامپوننت");
    await expect(page.locator("[data-brand]")).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}
