import { test as setup } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { adminAuthFile, loginAsAdmin } from "./helpers";

setup("authenticate admin session", async ({ page }) => {
  await fs.mkdir(path.dirname(adminAuthFile), { recursive: true });
  await loginAsAdmin(page);
  await page.context().storageState({ path: adminAuthFile });
});
