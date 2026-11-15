import { randomInt, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
const origin = "http://localhost:6106";
const post = (page: Page, path: string, data: unknown, key?: string) =>
  page.request.post(`/api/v1${path}`, {
    headers: { Origin: origin, ...(key ? { "Idempotency-Key": key } : {}) },
    data,
  });
async function signup(page: Page) {
  const issued = (
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
        challengeId: issued.challengeId,
        code: "000000",
      })
    ).status(),
  ).toBe(200);
}
test("S10 guest checkout retains intent through auth without granting access", async ({
  page,
}) => {
  await page.goto("/checkout?lesson=de-04");
  await page
    .getByRole("button", { name: "ورود برای ادامه خرید", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/auth" &&
      url.searchParams.get("returnTo") === "/checkout?lesson=de-04",
  );
  const no = await post(
    page,
    "/checkout",
    { productId: "shish-de-60" },
    randomUUID(),
  );
  expect(no.status()).toBe(401);
});
test("S10 actual checkout simulator verifies on server, duplicate result grants once and keeps lesson locks", async ({
  page,
}) => {
  await signup(page);
  await page.goto("/checkout?lesson=de-04");
  await expect(page.getByText(/فقط شبیه‌ساز آزمایشی/)).toBeVisible();
  await page
    .getByRole("button", { name: "رفتن به شبیه‌ساز پرداخت", exact: true })
    .click();
  await expect(page).toHaveURL((url) =>
    url.pathname.startsWith("/checkout/mock/"),
  );
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  await page
    .getByRole("button", { name: "شبیه‌سازی پرداخت موفق", exact: true })
    .click();
  await expect(page.getByTestId("purchase-status")).toHaveText("تأییدشده");
  expect(
    (await post(page, `/payments/mock/${id}`, { status: "verified" })).status(),
  ).toBe(200);
  const progress = (
    await (await page.request.get("/api/v1/me/progress")).json()
  ).data;
  expect(progress.lessons[59].access.commercial).toBe(true);
  expect(progress.lessons[1].access.pedagogical).toBe(false);
  expect(progress.lessons[3].access.canStart).toBe(false);
  await page
    .getByRole("button", { name: "ادامه یادگیری", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/path");
});
test("S10 forged return stays pending, polls delayed confirmation and cancel/failure preserve guest state", async ({
  page,
  browser,
}) => {
  await page.goto("/path");
  await expect(page.getByTestId("path-list").locator("article")).toHaveCount(60);
  const before = (await (await page.request.get("/api/v1/me/progress")).json())
    .data.subject.id;
  await signup(page);
  const created = (
    await (
      await post(
        page,
        "/checkout",
        { productId: "shish-de-60", lessonId: "de-02" },
        randomUUID(),
      )
    ).json()
  ).data;
  await page.goto(
    `/checkout/return?purchase=${created.purchaseId}&success=true`,
  );
  await expect(page.getByTestId("purchase-status")).toHaveText(
    "در انتظار تأیید سرور",
  );
  const other = await browser.newContext();
  expect(
    (
      await other.request.get(
        `${origin}/api/v1/purchases/${created.purchaseId}`,
      )
    ).status(),
  ).toBe(401);
  await other.close();
  expect(
    (
      await post(page, `/payments/mock/${created.purchaseId}`, {
        status: "verified",
      })
    ).status(),
  ).toBe(200);
  await expect(page.getByTestId("purchase-status")).toHaveText("تأییدشده", {
    timeout: 5000,
  });
  for (const [status, label] of [
    ["cancelled", "لغوشده"],
    ["failed", "ناموفق"],
  ]) {
    const order = (
      await (
        await post(
          page,
          "/checkout",
          { productId: "shish-de-60" },
          randomUUID(),
        )
      ).json()
    ).data;
    await page.goto(new URL(order.redirectUrl).pathname);
    await page
      .getByRole("button", {
        name:
          status === "cancelled"
            ? "لغو پرداخت آزمایشی"
            : "شبیه‌سازی خطای پرداخت",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("purchase-status")).toHaveText(label);
  }
  await post(page, "/auth/logout", {});
  const guest = (await (await page.request.get("/api/v1/me/progress")).json())
    .data;
  expect(guest.subject.id).toBe(before);
});
