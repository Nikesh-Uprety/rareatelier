import type { FonepayQrPayload } from "./api";

let qrCodeModulePromise: Promise<typeof import("qrcode")> | null = null;

async function loadQrCodeModule() {
  qrCodeModulePromise ??= import("qrcode");
  return qrCodeModulePromise;
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
