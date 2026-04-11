import { test, expect, request as playwrightRequest } from "@playwright/test";
import { openFirstProduct } from "./helpers";
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

  // Navigate to products and find one that's in stock
  await page.goto("/products");
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible({ timeout: 10_000 });

  // Find a product link that's not out of stock (look for products without "Out of Stock" badge)
  const productLinks = page.locator('a[href^="/product/"]');
  const count = await productLinks.count();

  let foundInStockProduct = false;
  for (let i = 0; i < count; i++) {
    await productLinks.nth(i).click();
    await page.waitForURL(/\/product\//);

    // Wait for product detail to load
    await page.waitForTimeout(1000);

    // Check if there's an enabled size button. We don't need to force a new
    // selection here because some products already preselect the default size.
    const enabledSizeBtn = page.locator("button.h-12.w-12:not([disabled])").first();
    const hasEnabledSize = await enabledSizeBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasEnabledSize) {
      foundInStockProduct = true;
      break;
    } else {
      // Go back to products list
      await page.goBack();
      await page.waitForURL(/\/products/);
      await page.waitForTimeout(500);
    }
  }

  if (!foundInStockProduct) {
    // If no in-stock product found, skip this test gracefully
    test.skip(true, "No in-stock products available for testing");
    return;
  }

  await expect(page.getByTestId("product-add-to-bag")).toBeVisible({ timeout: 5_000 });
  await expect(pageErrors, pageErrors.join("\n")).toEqual([]);
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
