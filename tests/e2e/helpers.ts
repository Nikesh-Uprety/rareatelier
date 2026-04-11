import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

export const adminAuthFile = path.join(process.cwd(), "tests/e2e/.auth/admin.json");

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill("admin@rare.np");
  await page.getByTestId("login-password").fill("admin123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function loginAsSuperadmin(page: Page) {
  const response = await page.context().request.post("/api/auth/login", {
    data: {
      email: "superadmin@rare.np",
      password: "superadmin123",
    },
  });
  const result = (await response.json()) as { success?: boolean; requires2FA?: boolean; error?: string };
  expect(response.ok(), result.error ?? "Superadmin login failed").toBeTruthy();
  expect(result.success, result.error ?? "Superadmin login failed").toBeTruthy();
  expect(result.requires2FA, "Superadmin test account unexpectedly requires OTP").not.toBeTruthy();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);
}

export async function openFirstProduct(page: Page) {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
  await page.locator('a[href^="/product/"]').first().click();
  await expect(page).toHaveURL(/\/product\//);
}

export async function fillCheckoutForm(page: Page, email: string) {
  await page.getByTestId("checkout-email").fill(email);
  await page.getByTestId("checkout-first-name").fill("Nikesh");
  await page.getByTestId("checkout-last-name").fill("Uprety");
  await page.getByTestId("checkout-address").fill("Lazimpat");
  await page.getByTestId("checkout-city").fill("Kathmandu");
  await page.getByTestId("checkout-phone").fill("9800000000");
  await page.getByTestId("checkout-delivery-location").fill("Kathmandu");
  await page.getByRole("button", { name: "Kathmandu Inside Ring Road" }).click();
}

export async function placeOnlineOrder(page: Page, email: string) {
  await openFirstProduct(page);
  await page.getByRole("button", { name: "Buy Now" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await fillCheckoutForm(page, email);
  await page.getByTestId("checkout-payment-esewa").click();
  await page.getByTestId("checkout-submit").click();
  await expect(page).toHaveURL(/\/checkout\/payment\?/);

  const url = new URL(page.url());
  const orderId = url.searchParams.get("orderId");
  expect(orderId).toBeTruthy();

  const uploadResponsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/orders/${orderId}/payment-proof`) && response.request().method() === "POST",
  );

  await page.getByTestId("payment-proof-input").setInputFiles({
    name: "payment-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn4s1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });

  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy();
  await expect(page.getByText("Screenshot uploaded. We will verify your payment shortly.")).toBeVisible();

  return orderId as string;
}

export async function pickSelectItem(trigger: Locator, label: string) {
  await trigger.click();
  await trigger.page().getByRole("option", { name: label }).click();
}
