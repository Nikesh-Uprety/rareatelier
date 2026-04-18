export const MAX_PRODUCT_IMAGES = 20;

export function remainingImageSlots(current: number): number {
  return Math.max(0, MAX_PRODUCT_IMAGES - current);
}

export function productImageCapMessage(current: number): string {
  return `You can add up to ${MAX_PRODUCT_IMAGES} images per product (currently ${current}).`;
}
