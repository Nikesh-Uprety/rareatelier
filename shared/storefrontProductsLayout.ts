import { z } from "zod";

export const STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY = "all";
export const STOREFRONT_PRODUCTS_MIN_COLUMNS = 2;
export const STOREFRONT_PRODUCTS_MAX_COLUMNS = 6;
export const STOREFRONT_PRODUCTS_DEFAULT_COLUMNS = 4;
export const STOREFRONT_PRODUCTS_MAX_FEATURED = 48;

export const storefrontProductsCategoryLayoutSchema = z.object({
  showInMenu: z.boolean().optional().default(true),
  desktopColumns: z.coerce
    .number()
    .int()
    .min(STOREFRONT_PRODUCTS_MIN_COLUMNS)
    .max(STOREFRONT_PRODUCTS_MAX_COLUMNS)
    .optional()
    .default(STOREFRONT_PRODUCTS_DEFAULT_COLUMNS),
  featuredProductIds: z
    .array(z.string().min(1))
    .max(STOREFRONT_PRODUCTS_MAX_FEATURED)
    .optional()
    .default([]),
});

export const storefrontProductsLayoutConfigSchema = z.object({
  showCategoryMenu: z.boolean().optional().default(true),
  defaultDesktopColumns: z.coerce
    .number()
    .int()
    .min(STOREFRONT_PRODUCTS_MIN_COLUMNS)
    .max(STOREFRONT_PRODUCTS_MAX_COLUMNS)
    .optional()
    .default(STOREFRONT_PRODUCTS_DEFAULT_COLUMNS),
  categories: z
    .record(z.string(), storefrontProductsCategoryLayoutSchema)
    .optional()
    .default({}),
});

export type StorefrontProductsCategoryLayout = z.infer<
  typeof storefrontProductsCategoryLayoutSchema
>;
export type StorefrontProductsLayoutConfig = z.infer<
  typeof storefrontProductsLayoutConfigSchema
>;

export function getDefaultStorefrontProductsLayoutConfig(): StorefrontProductsLayoutConfig {
  return {
    showCategoryMenu: true,
    defaultDesktopColumns: STOREFRONT_PRODUCTS_DEFAULT_COLUMNS,
    categories: {},
  };
}

export function normalizeStorefrontProductsLayoutConfig(
  value: unknown,
): StorefrontProductsLayoutConfig {
  const parsed = storefrontProductsLayoutConfigSchema.safeParse(value ?? {});
  if (parsed.success) return parsed.data;
  return getDefaultStorefrontProductsLayoutConfig();
}

export function getStorefrontProductsCategoryLayout(
  config: StorefrontProductsLayoutConfig | null | undefined,
  categoryKey: string,
): StorefrontProductsCategoryLayout {
  const normalizedConfig = normalizeStorefrontProductsLayoutConfig(config);
  const existing = normalizedConfig.categories?.[categoryKey];

  if (existing) {
    return storefrontProductsCategoryLayoutSchema.parse(existing);
  }

  return {
    showInMenu: true,
    desktopColumns: normalizedConfig.defaultDesktopColumns,
    featuredProductIds: [],
  };
}

