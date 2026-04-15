import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FonepayService } from "../../server/lib/fonepay";

const baseConfig = {
  merchantCode: "NBQM",
  merchantSecret: "a7e3512f5032480a83137793cb2021dc",
  pgBaseUrl: "https://dev-clientapi.fonepay.com",
  dynamicQrUrl:
    "https://dev-merchantapi.fonepay.com/convergentmerchantweb/api/merchant/merchantDetailsForThirdParty",
  username: "merchant-user",
  password: "merchant-pass",
};

describe("FonepayService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("generates a web payment URL and can recover the order id from the PRN", () => {
    const service = new FonepayService(baseConfig);
    const result = service.generateWebPaymentUrl({
      orderId: "9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805",
      amount: 5100,
      remarks1: "Order 7805",
      remarks2: "RARE Atelier",
      callbackUrl: "https://rare.test/api/payments/fonepay/callback",
    });

    expect(result.success).toBe(true);
    expect(result.paymentUrl).toContain("PID=NBQM");
    expect(result.paymentUrl).toContain("RU=https%3A%2F%2Frare.test%2Fapi%2Fpayments%2Ffonepay%2Fcallback");
    expect(service.extractOrderIdFromPrn(result.prn)).toBe(
      "9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805",
    );
  });

  it("validates the returned callback signature and rejects tampered values", () => {
    const service = new FonepayService(baseConfig);
    const payload = [
      "ORDER_9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805_1710000000000",
      "NBQM",
      "success",
      "00",
      "uid-123",
      "NMB",
      "wallet",
      "5100",
      "5100",
    ].join(",");

    const dv = crypto
      .createHmac("sha512", baseConfig.merchantSecret)
      .update(payload, "utf8")
      .digest("hex")
      .toUpperCase();

    expect(
      service.validateWebResponse({
        PRN: "ORDER_9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805_1710000000000",
        PID: "NBQM",
        PS: "success",
        RC: "00",
        UID: "uid-123",
        BC: "NMB",
        INI: "wallet",
        P_AMT: "5100",
        R_AMT: "5100",
        DV: dv,
      }),
    ).toBe(true);

    expect(() =>
      service.validateWebResponse({
        PRN: "ORDER_9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805_1710000000000",
        PID: "NBQM",
        PS: "success",
        RC: "00",
        UID: "uid-123",
        BC: "NMB",
        INI: "wallet",
        P_AMT: "9999",
        R_AMT: "5100",
        DV: dv,
      }),
    ).toThrow(/Invalid Fonepay response signature/);
  });

  it("verifies a web payment by parsing the XML response", async () => {
    const service = new FonepayService(baseConfig);
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        `<response>
          <success>true</success>
          <response_code>0</response_code>
          <message>SUCCESS</message>
          <amount>5100</amount>
          <uniqueId>uid-verified</uniqueId>
        </response>`,
        { status: 200, headers: { "Content-Type": "application/xml" } },
      ),
    );

    const result = await service.verifyWebPayment({
      prn: "ORDER_9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805_1710000000000",
      uid: "uid-verified",
      amount: 5100,
      pid: "NBQM",
      bankCode: "NMB",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.responseCode).toBe("0");
    expect(result.message).toBe("SUCCESS");
    expect(result.amount).toBe(5100);
    expect(result.uniqueId).toBe("uid-verified");
  });

  it("normalizes dynamic QR responses into a UI-friendly payload", async () => {
    const service = new FonepayService(baseConfig);

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          qrMessage: "fonepay://pay?prn=QR_123",
          qrImage:
            "iVBORw0KGgoAAAANSUhEUgAAAAUAiVBORw0KGgoAAAANSUhEUgAAAAUAiVBORw0KGgoAAAANSUhEUgAAAAUAiVBORw0KGgoAAAANSUhEUgAAAAUA",
          merchantName: "RARE Atelier",
          expiresAt: "2026-04-15T12:30:00+05:45",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await service.generateQrPayment({
      orderId: "9b54fd90-63ca-4b31-8ec7-2d5e1c7c7805",
      amount: 5100,
      remarks1: "POS 7805",
      remarks2: "RARE Atelier POS",
    });

    expect(result.success).toBe(true);
    expect(result.qrPayload.rawQrText).toBe("fonepay://pay?prn=QR_123");
    expect(result.qrPayload.imageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.qrPayload.merchantName).toBe("RARE Atelier");
    expect(result.qrPayload.expiresAt).toBe("2026-04-15T12:30:00+05:45");
  });
});
