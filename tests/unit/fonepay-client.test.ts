import { describe, expect, it, vi } from "vitest";
import { getFonepayQrPreviewSource, resolveFonepayQrPreviewSource } from "@/lib/fonepay";

vi.mock("qrcode", () => ({
  toDataURL: vi.fn(async (value: string) => `data:image/png;base64,qr-${value}`),
}));

describe("client fonepay helpers", () => {
  it("prefers direct image previews when the gateway provides them", async () => {
    const payload = {
      imageUrl: "https://cdn.rare.test/fonepay-qr.png",
      imageDataUrl: null,
      rawQrText: "fonepay://pay?prn=123",
      expiresAt: null,
      merchantName: null,
    };

    expect(getFonepayQrPreviewSource(payload)).toBe("https://cdn.rare.test/fonepay-qr.png");
    await expect(resolveFonepayQrPreviewSource(payload)).resolves.toBe(
      "https://cdn.rare.test/fonepay-qr.png",
    );
  });

  it("renders a QR data url from raw Fonepay text when no image is returned", async () => {
    await expect(
      resolveFonepayQrPreviewSource({
        imageUrl: null,
        imageDataUrl: null,
        rawQrText: "fonepay://pay?prn=abc-123",
        expiresAt: null,
        merchantName: "RARE Atelier",
      }),
    ).resolves.toBe("data:image/png;base64,qr-fonepay://pay?prn=abc-123");
  });
});
