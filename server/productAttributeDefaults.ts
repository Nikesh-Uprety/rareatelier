import { db } from "./db";
import { productAttributes } from "@shared/schema";
import {
  DEFAULT_PRODUCT_SIZES,
  DEFAULT_PRODUCT_VARIANTS,
  DEFAULT_PRODUCT_VARIANT_SWATCHES,
  normalizeAttributeLabel,
} from "@shared/productAttributes";

export async function ensureDefaultProductAttributes(): Promise<void> {
  const existing = await db.select().from(productAttributes);

  const existingColors = new Set(
    existing
      .filter((attribute) => attribute.type === "color")
      .map((attribute) => normalizeAttributeLabel(attribute.value)),
  );
  const existingSizes = new Set(
    existing
      .filter((attribute) => attribute.type === "size")
      .map((attribute) => normalizeAttributeLabel(attribute.value)),
  );

  const missingColors = DEFAULT_PRODUCT_VARIANTS
    .filter((variant) => !existingColors.has(variant))
    .map((variant) => ({
      type: "color",
      value: `${variant}|${DEFAULT_PRODUCT_VARIANT_SWATCHES[variant]}`,
    }));

  const missingSizes = DEFAULT_PRODUCT_SIZES
    .filter((size) => !existingSizes.has(size))
    .map((size) => ({
      type: "size",
      value: size,
    }));

  const missing = [...missingColors, ...missingSizes];
  if (missing.length === 0) return;

  await db.insert(productAttributes).values(missing);
}
