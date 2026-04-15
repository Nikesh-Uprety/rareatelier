import { test, expect } from "@playwright/test";
import { pickSelectItem, placeFonepayQrOrder, placeOnlineOrder } from "./helpers";

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

test("admin sees the Fonepay audit trail for a QR checkout", async ({ browser, page }) => {
  test.setTimeout(90_000);

  const uniqueEmail = `fonepay-audit-${Date.now()}@example.com`;
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  const orderId = await placeFonepayQrOrder(guestPage, uniqueEmail);
  await guestContext.close();

  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await page.getByTestId("admin-orders-search").fill(uniqueEmail);
  await page.getByTestId(`admin-order-row-${orderId}`).click();

  await expect(page.getByTestId("admin-order-fonepay-audit")).toBeVisible();
  await expect(page.getByText("Dynamic QR ready")).toBeVisible();
  await expect(page.getByText("Hosted redirect is skipped in E2E mode.")).toBeVisible();
  await expect(page.getByText("Bank selection and credentials stay on the hosted Fonepay side.")).toBeVisible();
  await expect(page.getByTestId("admin-order-fonepay-event-0")).toContainText("QR Verified");
  await expect(page.getByTestId("admin-order-fonepay-event-0")).toContainText("success");
});

test("admin image uploads persist lightweight preview variants", async ({ page }) => {
  test.setTimeout(90_000);

  const uniqueName = `e2e-admin-image-${Date.now()}.png`;

  await page.goto("/admin/images");
  await expect(page.getByRole("button", { name: "Upload Multiple" })).toBeVisible();

  const uploadResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return pathname === "/api/admin/images/upload" && response.request().method() === "POST";
  });

  await page.getByTestId("admin-images-upload-input").setInputFiles({
    name: uniqueName,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAABRUlEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4G4B5QABF2YV4QAAAABJRU5ErkJggg==",
      "base64",
    ),
  });

  await page.getByRole("button", { name: "Upload All" }).click();

  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok(), await uploadResponse.text()).toBeTruthy();
  const uploadJson = (await uploadResponse.json()) as {
    success?: boolean;
    data?:
      | {
          id: string;
          url: string | null;
          thumbnailUrl?: string | null;
          previewUrl?: string | null;
        }
      | Array<{
          id: string;
          url: string | null;
          thumbnailUrl?: string | null;
          previewUrl?: string | null;
        }>;
  };
  const asset = Array.isArray(uploadJson.data) ? uploadJson.data[0] : uploadJson.data;
  expect(asset?.id).toBeTruthy();
  expect(asset?.url).toBeTruthy();
  expect(asset?.thumbnailUrl).toBeTruthy();
  expect(asset?.previewUrl).toBeTruthy();
  expect(asset?.thumbnailUrl).not.toBe(asset?.url);
  expect(asset?.previewUrl).not.toBe(asset?.url);

  const gridImage = page.getByTestId(`admin-image-thumb-${asset!.id}`);
  await expect(gridImage).toBeVisible();
  await expect(gridImage).toHaveAttribute("src", asset!.thumbnailUrl!);
  await gridImage.click();
  await expect(page.getByTestId("admin-image-preview")).toHaveAttribute("src", asset!.previewUrl!);

  const cleanupResponse = await page.context().request.delete(`/api/admin/images/${asset!.id}`);
  expect(cleanupResponse.ok(), await cleanupResponse.text()).toBeTruthy();
});
