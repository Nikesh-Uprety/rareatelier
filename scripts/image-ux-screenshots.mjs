import { firefox } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:5002";
const OUT = path.resolve("artifacts/image-ux-fixes");
fs.mkdirSync(OUT, { recursive: true });

async function snap(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  saved ${file}`);
}

async function seedAdmin(page) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email: "superadmin@rare.np", password: "superadmin123" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok() || !body.success) {
    console.log("  superadmin login failed:", body.error || res.status());
    return false;
  }
  return true;
}

async function main() {
  const browser = await firefox.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();

  try {
    console.log("[storefront] / home");
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1200);
    await snap(page, "01-home");

    console.log("[storefront] /shop");
    await page.goto(`${BASE}/shop`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1800);
    await snap(page, "02-shop-cards");

    // Scroll down to show more cards
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(400);
    await snap(page, "03-shop-cards-scrolled");

    console.log("[admin] try login…");
    const ok = await seedAdmin(page);
    if (ok) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);
      await snap(page, "04-admin-dashboard");

      await page.goto(`${BASE}/admin/products`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);
      await snap(page, "05-admin-products-list");

      // Try opening Add-Product wizard
      const addBtn = page.locator("button, a").filter({ hasText: /^(add product|new product|add)$/i }).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click().catch(() => {});
        await page.waitForTimeout(1000);
        await snap(page, "06-add-product-wizard");
      }

      // Navigate Images / Buckets area for MediaLibrary capture
      await page.goto(`${BASE}/admin/buckets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);
      await snap(page, "07-admin-buckets");
    } else {
      console.log("  admin login not established — skipping admin captures");
    }
  } catch (err) {
    console.error("[screenshot error]", err?.message || err);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
