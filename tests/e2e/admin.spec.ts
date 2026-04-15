import { test, expect } from "@playwright/test";
import { pickSelectItem, placeOnlineOrder } from "./helpers";

test("admin completing an order auto-generates a bill", async ({ browser, page }) => {
  test.setTimeout(90_000);

  const uniqueEmail = `bill-${Date.now()}@example.com`;
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const orderId = await placeOnlineOrder(guestPage, uniqueEmail);
  await guestContext.close();

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await page.getByTestId("admin-orders-search").fill(uniqueEmail);
  await page.getByTestId(`admin-order-row-${orderId}`).click();
  await expect(page.getByTestId("admin-order-status-select")).toBeVisible();

  await pickSelectItem(page.getByTestId("admin-order-status-select"), "✅ Completed");
  await expect(page.getByTestId("admin-order-status-select")).toContainText("Completed");

  await expect
    .poll(
      async () => {
        const response = await page.context().request.get(`/api/admin/bills/by-order/${orderId}`);
        if (!response.ok()) return null;
        const json = (await response.json()) as {
          success?: boolean;
          data?: { orderId?: string | null; billNumber?: string | null } | null;
        };
        return json.data?.orderId ?? null;
      },
      { timeout: 15_000, message: "Expected a bill to be generated for the completed order" },
    )
    .toBe(orderId);

  const billResponse = await page.context().request.get(`/api/admin/bills/by-order/${orderId}`);
  expect(billResponse.ok()).toBeTruthy();
  const billJson = (await billResponse.json()) as {
    success?: boolean;
    data?: { billNumber?: string | null } | null;
  };
  expect(billJson.data?.billNumber).toMatch(/^RARE-INV-/);
});

test("admin can verify payment and manage a product", async ({ browser, page }) => {
  test.setTimeout(90_000);

  const uniqueEmail = `payment-${Date.now()}@example.com`;
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const orderId = await placeOnlineOrder(guestPage, uniqueEmail);
  await guestContext.close();

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await page.getByTestId("admin-orders-search").fill(uniqueEmail);
  await page.getByTestId(`admin-order-row-${orderId}`).click();
  await expect(page.getByTestId("admin-order-status-select")).toBeVisible();
  await expect(page.getByText("View screenshot")).toBeVisible();
  await page.getByTestId("admin-order-verify-payment").click();
  await expect
    .poll(
      async () => {
        const response = await page.context().request.get(
          `/api/admin/orders?search=${encodeURIComponent(uniqueEmail)}`,
        );
        if (!response.ok()) return null;
        const json = (await response.json()) as {
          data?: Array<{ id?: string; paymentVerified?: string | null }>;
        };
        return json.data?.find((order) => order.id === orderId)?.paymentVerified ?? null;
      },
      { timeout: 15_000, message: "Expected the admin payment verification to persist" },
    )
    .toBe("verified");
  await pickSelectItem(page.getByTestId("admin-order-status-select"), "✅ Completed");
  await expect(page.getByTestId("admin-order-status-select")).toContainText("Completed");

  const productName = `E2E Product ${Date.now()}`;

  await page.goto("/admin/products");
  await expect(page.getByTestId("admin-products-add-open")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("admin-products-add-open").click();
  await page.getByTestId("admin-product-name").fill(productName);
  await page.getByTestId("admin-product-short-details").fill("End-to-end test product");
  await page.getByTestId("admin-product-price").fill("2500");
  await page.getByTestId("admin-product-next-details").click();
  await page.getByTestId("admin-product-size-M").click();
  await page.getByTestId("admin-product-stock-M").fill("8");
  await page.getByTestId("admin-product-next-attributes").click();
  await page.getByTestId("admin-product-save").click();
  await expect(page.getByTestId("admin-product-save")).toHaveCount(0);

  await page.getByTestId("admin-products-search").fill(productName);
  await expect(page.getByText(productName).first()).toBeVisible();
  await page.locator("[data-testid^='admin-product-edit-open-']").first().click();
  await page.getByTestId("admin-product-edit-short-details").fill("Updated end-to-end test product");
  await page.getByTestId("admin-product-edit-save").click();
  await expect(page.getByTestId("admin-product-edit-save")).toHaveCount(0);
  await page.getByTestId("admin-products-search").fill(productName);
  await expect(page.getByText(productName).first()).toBeVisible();
  await page.locator("[data-testid^='admin-product-edit-open-']").first().click();
  await page.getByTestId("admin-product-delete").click();
  await page.getByRole("button", { name: "Move to Archive" }).click();
  await expect
    .poll(
      async () => {
        const response = await page.context().request.get(
          `/api/admin/products?search=${encodeURIComponent(productName)}&status=active`,
        );
        if (!response.ok()) return -1;
        const json = (await response.json()) as {
          data?: Array<{ name?: string | null }>;
        };
        return json.data?.filter((product) => product.name === productName).length ?? 0;
      },
      { timeout: 15_000, message: "Expected the archived product to disappear from the active list" },
    )
    .toBe(0);
});
