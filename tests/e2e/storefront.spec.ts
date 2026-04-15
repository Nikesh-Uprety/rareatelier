import { test, expect, request as playwrightRequest } from "@playwright/test";
import { fillMinimalCheckoutForm, openFirstProduct } from "./helpers";
import { waitForLatestOrderVerificationCodeByEmail } from "./db";

async function getSampleProduct(request: import("@playwright/test").APIRequestContext) {
  const res = await request.get("/api/products?limit=24");
  expect(res.ok(), await res.text()).toBeTruthy();
  const json = (await res.json()) as { data?: Array<{ id: string; price: number }> };
  const product = json?.data?.[0];
  expect(product?.id).toBeTruthy();
  expect(Number(product?.price ?? 0) > 0).toBeTruthy();
  return { productId: String(product!.id), priceAtTime: Number(product!.price) };
}

function buildOrderPayload(email: string, quantity: number, productId: string, priceAtTime: number) {
  return {
    items: [
      {
        productId,
        quantity,
        priceAtTime,
      },
    ],
    shipping: {
      firstName: "Limit",
      lastName: "Tester",
      email,
      phone: "9800000000",
      address: "Lazimpat",
      city: "Kathmandu",
      zip: "44600",
      country: "Nepal",
      deliveryLocation: "Kathmandu Inside Ring Road",
      locationCoordinates: "Kathmandu Inside Ring Road",
    },
    paymentMethod: "esewa",
    source: "website",
    deliveryRequired: true,
  };
}

test("home page loads and storefront shoppers can reach a purchasable product", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    if (error.message === "WebSocket closed without opened.") {
      return;
    }
    pageErrors.push(error.message);
  });

  await page.goto("/");
  await expect(page.getByRole("main").first()).toBeVisible({ timeout: 10_000 });

  await openFirstProduct(page);
  await expect(page.getByTestId("product-add-to-bag")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("product-buy-now")).toBeEnabled();
  await expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("landing newsletter popup can be dismissed and collection nav routes to the new collection page", async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.removeItem("rare-premium-newsletter-dialog-dismissed");
  });

  await page.goto("/");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Subscribe for early access." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close newsletter popup" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.goto("/products");
  const collectionLink = page.getByRole("link", { name: "Collection" }).first();
  await expect(collectionLink).toBeVisible();
  await collectionLink.click();
  await expect(page).toHaveURL(/\/new-collection$/);
});

test("online payment checkout accepts name and phone only and reaches order confirmation", async ({ page }) => {
  await openFirstProduct(page);
  await page.getByRole("button", { name: "Buy Now" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await fillMinimalCheckoutForm(page);
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
  await page.getByRole("button", { name: /Confirm Payment/i }).click();

  const createOrderResponse = await createOrderResponsePromise;
  expect(createOrderResponse.ok(), await createOrderResponse.text()).toBeTruthy();

  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy();

  await page.waitForURL(/\/order-confirmation\/[^/?]+/, { timeout: 15_000 });
  await expect(page.getByText("Payment Proof Under Review")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download as PDF" })).toBeVisible();
});

test("Fonepay checkout shows QR benefits and completes the simulated QR flow", async ({ page }) => {
  await openFirstProduct(page);
  await page.getByRole("button", { name: "Buy Now" }).click();
  await expect(page).toHaveURL(/\/checkout$/);

  await fillMinimalCheckoutForm(page);
  await page.getByTestId("checkout-payment-fonepay").click();
  await expect(page.getByTestId("checkout-fonepay-benefits")).toBeVisible();
  await expect(page.getByText("1% QR benefit")).toBeVisible();
  await expect(page.getByText("Rare Atelier fee NPR 0")).toBeVisible();

  await page.getByTestId("checkout-submit").click();
  await expect(page).toHaveURL(/\/checkout\/payment\?method=fonepay/);

  await expect(page.getByRole("heading", { name: "Pay with Fonepay" })).toBeVisible();
  await expect(page.getByTestId("fonepay-value-strip")).toBeVisible();
  await expect(page.getByText("Estimated QR savings")).toBeVisible();
  await expect(page.getByText("Usually minimal")).toBeVisible();
  await expect(
    page.getByText("E2E mode uses a simulated Fonepay QR confirmation loop."),
  ).toBeVisible();

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

  const qrResponse = await qrResponsePromise;
  expect(qrResponse.ok(), await qrResponse.text()).toBeTruthy();

  await expect(page.getByText("Session ref:")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("QR payload:")).toBeVisible();

  await page.waitForURL(/\/order-confirmation\/[^/?]+/, { timeout: 20_000 });
  await expect(page.getByText("Payment Proof Under Review")).toHaveCount(0);
  await expect(page.getByText("Fonepay payment confirmed", { exact: true }).first()).toBeVisible();
});

test("new customer can verify a large order by email and complete checkout", async ({ request }) => {
  const { productId, priceAtTime } = await getSampleProduct(request);
  const email = `new-limit-${Date.now()}@example.com`;

  const requestVerification = await request.post("/api/orders/verification/request", {
    data: {
      email,
      quantity: 6,
    },
  });

  expect(requestVerification.ok(), await requestVerification.text()).toBeTruthy();
  const challenge = (await requestVerification.json()) as {
    success?: boolean;
    required?: boolean;
    challengeId?: string;
  };
  expect(challenge.success).toBe(true);
  expect(challenge.required).toBe(true);
  expect(challenge.challengeId).toBeTruthy();

  const code = await waitForLatestOrderVerificationCodeByEmail(email);
  const confirmVerification = await request.post("/api/orders/verification/confirm", {
    data: {
      challengeId: challenge.challengeId,
      email,
      code,
    },
  });

  expect(confirmVerification.ok(), await confirmVerification.text()).toBeTruthy();
  const confirmed = (await confirmVerification.json()) as {
    success?: boolean;
    verificationToken?: string;
  };
  expect(confirmed.success).toBe(true);
  expect(confirmed.verificationToken).toBeTruthy();

  const res = await request.post("/api/orders", {
    data: {
      ...buildOrderPayload(email, 6, productId, priceAtTime),
      orderVerificationToken: confirmed.verificationToken,
    },
  });

  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { success?: boolean; data?: { order?: { id?: string } } };
  expect(body.success).toBe(true);
  expect(body.data?.order?.id).toBeTruthy();
});

test("large-order verification resend is rate limited with a cooldown", async ({ request }) => {
  const email = `resend-limit-${Date.now()}@example.com`;

  const firstRequest = await request.post("/api/orders/verification/request", {
    data: {
      email,
      quantity: 6,
    },
  });

  expect(firstRequest.ok(), await firstRequest.text()).toBeTruthy();
  const firstBody = (await firstRequest.json()) as {
    success?: boolean;
    challengeId?: string;
    resendCooldownSeconds?: number;
    resendAvailableInSeconds?: number;
  };
  expect(firstBody.success).toBe(true);
  expect(firstBody.challengeId).toBeTruthy();
  expect(firstBody.resendCooldownSeconds).toBeGreaterThan(0);
  expect(firstBody.resendAvailableInSeconds).toBeGreaterThan(0);

  const secondRequest = await request.post("/api/orders/verification/request", {
    data: {
      email,
      quantity: 6,
    },
  });

  expect(secondRequest.status()).toBe(429);
  const secondBody = (await secondRequest.json()) as {
    success?: boolean;
    required?: boolean;
    code?: string;
    challengeId?: string;
    resendCooldownSeconds?: number;
    resendAvailableInSeconds?: number;
  };
  expect(secondBody.success).toBe(false);
  expect(secondBody.required).toBe(true);
  expect(secondBody.code).toBe("VERIFICATION_RESEND_COOLDOWN");
  expect(secondBody.challengeId).toBe(firstBody.challengeId);
  expect(secondBody.resendCooldownSeconds).toBe(60);
  expect(secondBody.resendAvailableInSeconds).toBeGreaterThan(0);
});

test("customer with at least 5 prior orders can place order above 5 items", async ({ request }) => {
  const { productId, priceAtTime } = await getSampleProduct(request);
  const email = `trusted-limit-${Date.now()}@example.com`;

  for (let i = 0; i < 5; i++) {
    const seedRes = await request.post("/api/orders", {
      data: buildOrderPayload(email, 1, productId, priceAtTime),
    });
    expect(seedRes.ok(), await seedRes.text()).toBeTruthy();
  }

  const largeRes = await request.post("/api/orders", {
    data: buildOrderPayload(email, 6, productId, priceAtTime),
  });

  expect(largeRes.ok(), await largeRes.text()).toBeTruthy();
  const body = (await largeRes.json()) as { success?: boolean; data?: { order?: { id?: string } } };
  expect(body.success).toBe(true);
  expect(body.data?.order?.id).toBeTruthy();
});

test("cart quantity controls stop at the available variant stock", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("ra-guest-id", `test-guest-${Date.now()}`);
    window.localStorage.setItem(
      "ra-guest-cart-items",
      JSON.stringify([
        {
          id: "stock-test-product-M-Black",
          product: {
            id: "stock-test-product",
            name: "Stock Test Tee",
            sku: "stock-test-product",
            price: 2400,
            stock: 2,
            category: "Tees",
            images: [],
            variants: [
              { size: "M", color: "Black", stock: 2 },
            ],
          },
          variant: { size: "M", color: "Black" },
          quantity: 1,
        },
      ]),
    );
  });

  await page.goto("/cart");
  const incrementButton = page.getByTestId("cart-increment-stock-test-product-M-Black");
  await expect(incrementButton).toBeVisible();
  await expect(incrementButton).toBeEnabled();

  await incrementButton.click();
  await expect(page.getByText("2").first()).toBeVisible();
  await expect(incrementButton).toBeDisabled();
});

test("guest order details stay scoped to the buyer session", async ({ request }) => {
  const { productId, priceAtTime } = await getSampleProduct(request);
  const email = `guest-scope-${Date.now()}@example.com`;

  const orderRes = await request.post("/api/orders", {
    data: buildOrderPayload(email, 1, productId, priceAtTime),
  });
  expect(orderRes.ok(), await orderRes.text()).toBeTruthy();

  const orderBody = (await orderRes.json()) as { data?: { order?: { id?: string } } };
  const orderId = String(orderBody.data?.order?.id ?? "");
  expect(orderId).toBeTruthy();

  const ownerRead = await request.get(`/api/orders/${orderId}`);
  expect(ownerRead.ok(), await ownerRead.text()).toBeTruthy();

  const outsider = await playwrightRequest.newContext({
    baseURL: test.info().project.use.baseURL as string,
  });
  try {
    const outsiderRead = await outsider.get(`/api/orders/${orderId}`);
    expect(outsiderRead.status()).toBe(403);
  } finally {
    await outsider.dispose();
  }
});
