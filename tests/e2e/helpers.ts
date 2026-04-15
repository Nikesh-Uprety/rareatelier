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
  const productLinks = page.locator('a[href^="/product/"]');
  await expect(productLinks.first()).toBeVisible();

  const sizeLabels = [/^XXS$/i, /^XS$/i, /^S$/i, /^M$/i, /^L$/i, /^XL$/i, /^XXL$/i, /^XXXL$/i, /^ONE$/i, /^One Size$/i, /^Free Size$/i];
  const count = await productLinks.count();

  for (let i = 0; i < count; i++) {
    await productLinks.nth(i).click();
    await expect(page).toHaveURL(/\/product\//);

    const buyNowButton = page.getByTestId("product-buy-now");
    await expect(buyNowButton).toBeVisible({ timeout: 5_000 });

    let canBuyNow = await buyNowButton.isEnabled().catch(() => false);
    if (!canBuyNow) {
      for (const label of sizeLabels) {
        const sizeButton = page.getByRole("button", { name: label }).first();
        const isVisible = await sizeButton.isVisible().catch(() => false);
        const isEnabled = isVisible ? await sizeButton.isEnabled().catch(() => false) : false;
        if (isVisible && isEnabled) {
          await sizeButton.click();
          canBuyNow = await buyNowButton.isEnabled().catch(() => false);
          if (canBuyNow) break;
        }
      }
    }

    if (canBuyNow) {
      await expect(buyNowButton).toBeEnabled();
      return;
    }

    await page.goBack();
    await expect(page).toHaveURL(/\/products/);
  }

  throw new Error("No purchasable product with an available size was found.");
}

export async function fillCheckoutForm(page: Page, email: string) {
  await page.getByTestId("checkout-email").fill(email);
  await page.getByTestId("checkout-full-name").fill("Nikesh Uprety");
  await page.getByTestId("checkout-address").fill("Lazimpat");
  await page.getByTestId("checkout-landmark").fill("Near Durbar Marg");
  await page.getByTestId("checkout-phone").fill("9800000000");
  await page.getByTestId("checkout-delivery-location").fill("Kathmandu");
  await page.getByRole("button", { name: "Kathmandu Inside Ring Road" }).click();
}

export async function fillMinimalCheckoutForm(page: Page) {
  await page.getByTestId("checkout-full-name").fill("Nikesh Uprety");
  await page.getByTestId("checkout-phone").fill("98");
  await expect(page.getByText("Add 8 more digits to complete your mobile number.")).toBeVisible();
  await page.getByTestId("checkout-phone").fill("9800000000");
  await expect(page.getByText("Nepal mobile number only. The +977 country code is already added for you.")).toBeVisible();
}

export async function placeOnlineOrder(page: Page, email: string) {
  await openFirstProduct(page);
  await page.getByRole("button", { name: "Buy Now" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await fillCheckoutForm(page, email);
  await page.getByTestId("checkout-payment-esewa").click();
  await page.getByTestId("checkout-submit").click();
  await expect(page).toHaveURL(/\/checkout\/payment/);

  const createOrderResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return pathname === "/api/orders" && response.request().method() === "POST";
  });
  const uploadResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return /\/api\/orders\/[^/]+\/payment-proof$/.test(pathname) && response.request().method() === "POST";
  });

  await page.getByTestId("payment-proof-input").setInputFiles({
    name: "payment-proof.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn4s1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Confirm payment" }).click();

  const createOrderResponse = await createOrderResponsePromise;
  expect(createOrderResponse.ok(), await createOrderResponse.text()).toBeTruthy();
  const createOrderJson = (await createOrderResponse.json()) as {
    success?: boolean;
    data?: { order?: { id?: string | null } | null } | null;
  };
  const orderId = createOrderJson.data?.order?.id ?? null;
  expect(orderId).toBeTruthy();

  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy();
  await expect(
    page.getByText("Payment screenshot uploaded. Order created successfully.", { exact: true }),
  ).toBeVisible();
  await page.waitForURL(/\/order-confirmation\/[^/?]+/);

  return orderId as string;
}

export async function placeFonepayQrOrder(page: Page, email: string) {
  await openFirstProduct(page);
  await page.getByRole("button", { name: "Buy Now" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await fillCheckoutForm(page, email);
  await page.getByTestId("checkout-payment-fonepay").click();
  await page.getByTestId("checkout-submit").click();
  await expect(page).toHaveURL(/\/checkout\/payment\?method=fonepay/);

  const createOrderResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return pathname === "/api/orders" && response.request().method() === "POST";
  });
  const qrResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return pathname === "/api/payments/fonepay/qr" && response.request().method() === "POST";
  });

  await page.getByRole("button", { name: /Generate Dynamic QR/i }).click();

  const createOrderResponse = await createOrderResponsePromise;
  expect(createOrderResponse.ok(), await createOrderResponse.text()).toBeTruthy();
  const createOrderJson = (await createOrderResponse.json()) as {
    success?: boolean;
    data?: { order?: { id?: string | null } | null } | null;
  };
  const orderId = createOrderJson.data?.order?.id ?? null;
  expect(orderId).toBeTruthy();

  const qrResponse = await qrResponsePromise;
  expect(qrResponse.ok(), await qrResponse.text()).toBeTruthy();

  await page.waitForURL(/\/order-confirmation\/[^/?]+/, { timeout: 20_000 });
  return orderId as string;
}

export async function pickSelectItem(trigger: Locator, label: string) {
  await trigger.click();
  await trigger.page().getByRole("option", { name: label }).click();
}
