export const DEFAULT_PRODUCT_VARIANTS = [
  "butter yellow",
  "pink",
  "grey",
  "blue",
  "black",
  "melange grey",
  "navy",
  "cream",
  "green",
  "brown",
  "navy blue",
  "stone grey",
] as const;

export const DEFAULT_PRODUCT_SIZES = [
  "m",
  "l",
  "xl",
  "xxl",
] as const;

export const DEFAULT_PRODUCT_VARIANT_SWATCHES: Record<string, string> = {
  "butter yellow": "#F2D77E",
  "pink": "#E7A7B7",
  "grey": "#8B8F97",
  "blue": "#4B6EA9",
  "black": "#1A1A1A",
  "melange grey": "#A8A9AD",
  "navy": "#23395D",
  "cream": "#F3EBDD",
  "green": "#476B52",
  "brown": "#7A5A43",
  "navy blue": "#1F3A5B",
  "stone grey": "#9A9C97",
};

export function extractAttributeLabel(value: string | null | undefined): string {
  return (value ?? "").split("|")[0]?.trim() ?? "";
}

export function normalizeAttributeLabel(value: string | null | undefined): string {
  return extractAttributeLabel(value).toLowerCase();
}

export function uniqueNormalizedValues(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const label = extractAttributeLabel(value);
    const normalized = normalizeAttributeLabel(value);
    if (!label || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(label);
  }

  return result;
}
