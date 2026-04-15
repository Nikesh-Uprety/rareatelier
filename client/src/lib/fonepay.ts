import type { FonepayQrPayload } from "./api";

let qrCodeModulePromise: Promise<typeof import("qrcode")> | null = null;

export const FONEPAY_QR_BENEFIT_RATE = 0.01;
export const FONEPAY_QR_PROMO_CEILING_RATE = 0.05;
export const FONEPAY_RARE_ATELIER_FEE_NPR = 0;
export const FONEPAY_PROVIDER_CHARGE_NOTE =
  "Your bank or wallet may show a small service charge before you approve the payment.";

async function loadQrCodeModule() {
  qrCodeModulePromise ??= import("qrcode");
  return qrCodeModulePromise;
}

export function getFonepayEstimatedQrSavings(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(0, Math.round(amount * FONEPAY_QR_BENEFIT_RATE));
}

export function getFonepayQrPreviewSource(payload?: FonepayQrPayload | null): string | null {
  if (!payload) return null;
  return payload.imageDataUrl || payload.imageUrl || null;
}

export async function resolveFonepayQrPreviewSource(
  payload?: FonepayQrPayload | null,
): Promise<string | null> {
  if (!payload) return null;

  if (payload.imageDataUrl) return payload.imageDataUrl;
  if (payload.imageUrl) return payload.imageUrl;

  const rawQrText = payload.rawQrText?.trim();
  if (!rawQrText) return null;

  const { toDataURL } = await loadQrCodeModule();
  return toDataURL(rawQrText, {
    margin: 1,
    scale: 8,
    errorCorrectionLevel: "M",
    color: {
      dark: "#111111",
      light: "#FFFFFF",
    },
  });
}
