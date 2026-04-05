import { logger } from "../logger";

const FALLBACK_RATE = 148;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

let cachedRate: number | null = null;
let cachedAt: number | null = null;

export async function getUsdToNprRate(): Promise<number> {
  if (cachedRate && cachedAt && Date.now() - cachedAt < CACHE_DURATION_MS) {
    return cachedRate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!res.ok) {
      logger.warn(`Exchange rate API returned ${res.status}, using fallback`);
      return FALLBACK_RATE;
    }

    const data = (await res.json()) as {
      result: string;
      rates?: Record<string, number>;
    };

    if (data.result === "success" && data.rates?.NPR) {
      const rate = data.rates.NPR;
      cachedRate = rate;
      cachedAt = Date.now();
      logger.info(`Fetched live USD/NPR rate: ${rate}`);
      return rate;
    }

    logger.warn("Exchange rate API missing NPR rate, using fallback");
    return FALLBACK_RATE;
  } catch (err) {
    logger.warn(
      `Failed to fetch exchange rate: ${err instanceof Error ? err.message : "unknown"}, using fallback`
    );
    return FALLBACK_RATE;
  }
}

export function convertNprToUsd(nprAmount: number, rate: number): number {
  const usd = nprAmount / rate;
  return Math.ceil(usd * 100) / 100; // round up to nearest cent
}

export function convertNprToUsdCents(nprAmount: number, rate: number): number {
  const usd = convertNprToUsd(nprAmount, rate);
  return Math.round(usd * 100); // Stripe requires integer cents
}

export function formatUsdForStripe(nprAmount: number, rate: number): {
  usd: number;
  cents: number;
} {
  const usd = convertNprToUsd(nprAmount, rate);
  const cents = convertNprToUsdCents(nprAmount, rate);
  return { usd, cents };
}
