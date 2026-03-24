import { test, expect } from "@playwright/test";
import { fillCheckoutForm, openFirstProduct } from "./helpers";

test("home page loads and core storefront checkout path works", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => {
    if (error.message === "WebSocket closed without opened.") {
      return;
    }
    pageErrors.push(error.message);
  });

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Shop", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Beyond Trends." })).toBeVisible();

  await openFirstProduct(page);
  await page.getByRole("button", { name: "Add to Bag" }).click();
  await expect(page.locator('a[href="/cart"]')).toBeVisible();
  await page.locator('a[href="/cart"]').click();
  await expect(page.getByRole("heading", { name: "Your Bag" })).toBeVisible();
  await page.locator("[data-testid^='cart-increment-']").first().click();
  await page.getByTestId("cart-proceed-checkout").click();

  await expect(page).toHaveURL(/\/checkout$/);
  await fillCheckoutForm(page, `cod-${Date.now()}@example.com`);
  await page.getByTestId("checkout-submit").click();

  await expect(page).toHaveURL(/\/order-confirmation\//);
  await expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
