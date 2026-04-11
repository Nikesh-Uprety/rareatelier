import { expect, test, type APIRequestContext } from "@playwright/test";

import { deleteCanvasPageById } from "./db";
import { loginAsSuperadmin } from "./helpers";

test.setTimeout(150_000);

async function getAdminCanvasPage(api: APIRequestContext, pageId: number) {
  const response = await api.get(`/api/admin/canvas/pages/${pageId}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function getPublicCanvasPageConfig(api: APIRequestContext, slug: string) {
  const response = await api.get(`/api/public/page-config?slug=${encodeURIComponent(slug)}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test("superadmin can create, edit, reorder, delete, and publish a canvas page", async ({ page }) => {
  const suffix = Date.now();
  const title = `Draft Test Page ${suffix}`;
  const slug = `/draft-test-${suffix}`;
  let pageId: number | null = null;

  try {
    await loginAsSuperadmin(page);
    await page.goto("/admin/canvas");
    await expect(page.getByRole("button", { name: "Add Page" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Add Page" }).click();
    await page.getByLabel("Page Title").fill(title);
    await page.getByLabel("URL Slug").fill(slug);
    await page.getByRole("button", { name: "Create Blank Page" }).click();

    await expect(page.getByRole("button", { name: "Open visual builder" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Open visual builder" }).click();

    await expect(page).toHaveURL(/\/admin\/canvas\/builder\?pageId=\d+/);
    pageId = Number(new URL(page.url()).searchParams.get("pageId"));
    expect(Number.isFinite(pageId) && pageId > 0).toBeTruthy();

    await page.getByRole("button", { name: "Add a Section" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Quote Block", exact: true }).click();
    await expect(page.getByText("Crafted slowly. Worn often. Remembered always.")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Add a Section" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Divider", exact: true }).click();

    await expect.poll(async () => {
      const adminPage = await getAdminCanvasPage(page.context().request, pageId!);
      return adminPage.sections.length;
    }).toBe(2);

    const adminPageAfterAdd = await getAdminCanvasPage(page.context().request, pageId!);
    const dividerSection = adminPageAfterAdd.sections.find((section: any) => {
      if (section.sectionType === "divider") return true;
      return section.sectionType === "campaign" && section.config?.variant === "divider";
    });

    expect(dividerSection).toBeTruthy();

    await page.locator(`[data-section-row-id="${dividerSection.id}"]`).click();
    await page.getByRole("button", { name: "Move up" }).last().click();

    await expect.poll(async () => {
      const adminPage = await getAdminCanvasPage(page.context().request, pageId!);
      const orderedSections = [...adminPage.sections].sort((a: any, b: any) => a.orderIndex - b.orderIndex);
      return orderedSections[0]?.id ?? null;
    }).toBe(dividerSection.id);

    const dividerRow = page.locator(`[data-section-row-id="${dividerSection.id}"]`);
    await dividerRow.locator('[title="Delete section"]').click({ force: true });
    await dividerRow.getByRole("button", { name: "Yes" }).click();

    await expect.poll(async () => {
      const adminPage = await getAdminCanvasPage(page.context().request, pageId!);
      return adminPage.sections.some((section: any) => section.id === dividerSection.id);
    }).toBe(false);

    await page.getByRole("button", { name: "Publish" }).click();
    await expect.poll(async () => {
      const adminPage = await getAdminCanvasPage(page.context().request, pageId!);
      return adminPage.status;
    }).toBe("published");

    const publicPageConfig = await getPublicCanvasPageConfig(page.context().request, slug);
    expect(publicPageConfig.page?.slug).toBe(slug);
    expect(publicPageConfig.page?.status).toBe("published");
    expect(
      publicPageConfig.sections.some((section: any) => section.sectionType === "quote"),
    ).toBeTruthy();

    await page.goto(slug);
    await expect(page.locator("main")).toContainText(/Crafted\s*slowly\./, { timeout: 15_000 });
    await expect(page.locator("main")).toContainText(/Remembered\s*always\./, { timeout: 15_000 });
  } finally {
    if (pageId) {
      await deleteCanvasPageById(pageId);
    }
  }
});
