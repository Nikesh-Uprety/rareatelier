export function formatPrice(amount: number | string): string {
  const num =
    typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);

  if (Number.isNaN(num)) {
    return "Rs. 0";
  }

  return "Rs. " + num.toLocaleString("en-NP");
}



export function formatStorefrontPrice(amount: number | string): string {
  const num =
    typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);

  if (Number.isNaN(num)) {
    return "रू 0";
  }

  return "रू " + num.toLocaleString("en-NP");
}
