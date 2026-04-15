import { describe, expect, it } from "vitest";

import {
  STOREFRONT_IMAGE_REMOTE_ORIGINS,
  buildStorefrontImageUrl,
  buildStorefrontPresetImageUrl,
  getStorefrontImagePresetOptions,
  getStorefrontProductImageSources,
  parseStorefrontGalleryUrls,
} from "@/lib/storefrontImage";

describe("storefront image helpers", () => {
  it("returns the expected preset options for product cards", () => {
    expect(getStorefrontImagePresetOptions("productCardPrimary")).toEqual({
      width: 560,
      height: 760,
      fit: "cover",
      quality: 68,
    });

    expect(getStorefrontImagePresetOptions("galleryFullscreen")).toEqual({
      width: 1800,
      height: 2400,
      fit: "inside",
      quality: 82,
    });
  });

  it("builds optimized storefront URLs from presets without changing the public route", () => {
    const url = buildStorefrontPresetImageUrl(
      "https://rare.t3.tigrisfiles.io/products/test-image.webp",
      "productCardPrimary",
    );

    expect(url.startsWith("/api/public/image?")).toBe(true);

    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("src")).toBe("https://rare.t3.tigrisfiles.io/products/test-image.webp");
    expect(params.get("w")).toBe("560");
    expect(params.get("h")).toBe("760");
    expect(params.get("fit")).toBe("cover");
    expect(params.get("q")).toBe("68");
  });

  it("passes unsupported sources through unchanged", () => {
    expect(
      buildStorefrontImageUrl("https://example.com/not-allowed.jpg", {
        width: 500,
        height: 500,
        fit: "cover",
        quality: 70,
      }),
    ).toBe("https://example.com/not-allowed.jpg");
  });

  it("publishes the preconnect origins used by storefront seo", () => {
    expect(STOREFRONT_IMAGE_REMOTE_ORIGINS).toContain("https://rare.t3.tigrisfiles.io");
    expect(STOREFRONT_IMAGE_REMOTE_ORIGINS).toContain("https://res.cloudinary.com");
  });

  it("parses gallery JSON and dedupes product image sources", () => {
    expect(parseStorefrontGalleryUrls('["/uploads/a.webp","/uploads/b.webp",""]')).toEqual([
      "/uploads/a.webp",
      "/uploads/b.webp",
    ]);

    expect(
      getStorefrontProductImageSources(
        " /uploads/a.webp ",
        '["/uploads/a.webp","/uploads/b.webp","https://rare.t3.tigrisfiles.io/x.webp"]',
      ),
    ).toEqual([
      "/uploads/a.webp",
      "/uploads/b.webp",
      "https://rare.t3.tigrisfiles.io/x.webp",
    ]);
  });
});
