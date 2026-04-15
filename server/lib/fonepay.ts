import crypto from "node:crypto";
import { parseStringPromise } from "xml2js";
import { logger } from "../logger";

type FonepayConfig = {
  merchantCode: string;
  merchantSecret: string;
  pgBaseUrl: string;
  dynamicQrUrl: string;
  username: string;
  password: string;
};

export type FonepayWebPaymentResult = {
  success: true;
  prn: string;
  paymentUrl: string;
  amount: string;
};

export type FonepayWebVerificationResult = {
  success: boolean;
  responseCode: string;
  message: string;
  amount: number;
  uniqueId: string;
  raw: Record<string, unknown>;
};

export type FonepayQrPaymentResult = {
  success: true;
  prn: string;
  amount: string;
  qrPayload: FonepayQrPayload;
  qrData: unknown;
};

export type FonepayQrVerificationResult = {
  success: boolean;
  status: string;
  data: unknown;
};

export type FonepayQrPayload = {
  imageUrl: string | null;
  imageDataUrl: string | null;
  rawQrText: string | null;
  expiresAt: string | null;
  merchantName: string | null;
};

type GenerateWebPaymentInput = {
  orderId: string;
  amount: number | string;
  remarks1: string;
  remarks2: string;
  callbackUrl: string;
};

type VerifyWebPaymentInput = {
  prn: string;
  uid: string;
  amount: number | string;
  pid?: string;
  bankCode?: string;
};

type GenerateQrPaymentInput = {
  orderId: string;
  amount: number | string;
  remarks1: string;
  remarks2: string;
};

type ValidateWebResponseInput = {
  PRN?: string;
  PID?: string;
  PS?: string;
  RC?: string;
  UID?: string;
  BC?: string;
  INI?: string;
  P_AMT?: string;
  R_AMT?: string;
  DV?: string;
};

function readFonepayConfig(overrides: Partial<FonepayConfig> = {}): FonepayConfig {
  return {
    merchantCode: overrides.merchantCode ?? process.env.FONEPAY_PG_MERCHANT_CODE?.trim() ?? "",
    merchantSecret: overrides.merchantSecret ?? process.env.FONEPAY_PG_MERCHANT_SECRET?.trim() ?? "",
    pgBaseUrl: overrides.pgBaseUrl ?? process.env.FONEPAY_PG_URL?.trim() ?? "",
    dynamicQrUrl: overrides.dynamicQrUrl ?? process.env.FONEPAY_DYNAMICQR_URL?.trim() ?? "",
    username: overrides.username ?? process.env.FONEPAY_USERNAME?.trim() ?? "",
    password: overrides.password ?? process.env.FONEPAY_PASSWORD?.trim() ?? "",
  };
}

function createSignature(secret: string, payload: string): string {
  return crypto.createHmac("sha512", secret).update(payload, "utf8").digest("hex");
}

function normalizeAmount(value: number | string): string {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(String(value).trim());

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new Error("Fonepay amount must be a positive number");
  }

  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2);
}

function formatPaymentDate(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function sanitizeRemark(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

type NamedStringEntry = {
  key: string;
  path: string;
  value: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeQrImageUrl(value: string): boolean {
  return /^https?:\/\/\S+/i.test(value) && /\.(?:png|jpe?g|webp|svg)(?:\?.*)?$/i.test(value);
}

function looksLikeBase64Image(value: string): boolean {
  const sanitized = value.replace(/\s+/g, "");
  return (
    sanitized.length > 96 &&
    /^[A-Za-z0-9+/=]+$/.test(sanitized) &&
    (sanitized.startsWith("iVBOR") || sanitized.startsWith("/9j/") || sanitized.startsWith("R0lGOD"))
  );
}

function asImageDataUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (looksLikeBase64Image(trimmed)) {
    const format = trimmed.startsWith("/9j/") ? "jpeg" : "png";
    return `data:image/${format};base64,${trimmed}`;
  }
  return null;
}

function collectNamedStringEntries(
  value: unknown,
  path: string[] = [],
  entries: NamedStringEntry[] = [],
): NamedStringEntry[] {
  if (path.length > 5) return entries;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) {
      const key = path[path.length - 1]?.toLowerCase() ?? "";
      entries.push({
        key,
        path: path.join(".").toLowerCase(),
        value: trimmed,
      });
    }
    return entries;
  }

  if (Array.isArray(value)) {
    value.slice(0, 8).forEach((entry, index) => {
      collectNamedStringEntries(entry, [...path, String(index)], entries);
    });
    return entries;
  }

  if (isRecord(value)) {
    Object.entries(value).forEach(([key, entry]) => {
      collectNamedStringEntries(entry, [...path, key], entries);
    });
  }

  return entries;
}

function pickNamedString(
  entries: NamedStringEntry[],
  keywords: string[],
  predicate?: (value: string) => boolean,
): string | null {
  const matched = entries.find((entry) => {
    const keyMatch = keywords.some((keyword) => entry.key.includes(keyword) || entry.path.includes(keyword));
    if (!keyMatch) return false;
    return predicate ? predicate(entry.value) : true;
  });

  return matched?.value ?? null;
}

function extractQrPayload(qrData: unknown): FonepayQrPayload {
  const entries = collectNamedStringEntries(qrData);
  const imageDataUrl =
    pickNamedString(entries, ["qrimage", "image", "base64", "dataurl"], (value) => asImageDataUrl(value) !== null)
      ?.trim() ?? null;
  const normalizedImageDataUrl = imageDataUrl ? asImageDataUrl(imageDataUrl) : null;

  const imageUrl =
    pickNamedString(entries, ["qrimage", "imageurl", "image", "qrurl", "downloadurl"], looksLikeQrImageUrl) ??
    entries.find((entry) => looksLikeQrImageUrl(entry.value))?.value ??
    null;

  const rawQrText =
    pickNamedString(
      entries,
      ["qrtext", "qrstring", "qrcontent", "qrmessage", "payload", "content", "text", "qrcode", "qrdata"],
      (value) => !looksLikeQrImageUrl(value) && asImageDataUrl(value) === null && value.length >= 8,
    ) ??
    null;

  return {
    imageUrl,
    imageDataUrl: normalizedImageDataUrl,
    rawQrText,
    expiresAt:
      pickNamedString(entries, ["expiry", "expires", "validuntil", "expiration"]) ??
      null,
    merchantName:
      pickNamedString(entries, ["merchantname", "merchant", "name"]) ??
      null,
  };
}

export class FonepayService {
  private readonly config: FonepayConfig;

  constructor(configOverrides: Partial<FonepayConfig> = {}) {
    this.config = readFonepayConfig(configOverrides);

    if (!this.isWebConfigured()) {
      logger.warn(
        "FONEPAY web payment environment variables are incomplete. Web redirect flow will be unavailable.",
      );
    }

    if (!this.isDynamicQrConfigured()) {
      logger.warn(
        "FONEPAY dynamic QR environment variables are incomplete. QR flow will be unavailable.",
      );
    }
  }

  isWebConfigured(): boolean {
    return Boolean(
      this.config.merchantCode &&
        this.config.merchantSecret &&
        this.config.pgBaseUrl,
    );
  }

  isDynamicQrConfigured(): boolean {
    return Boolean(
      this.config.merchantCode &&
        this.config.merchantSecret &&
        this.config.dynamicQrUrl &&
        this.config.username &&
        this.config.password,
    );
  }

  getMerchantCode(): string {
    return this.config.merchantCode;
  }

  extractOrderIdFromPrn(prn: string): string | null {
    const trimmedPrn = prn.trim();
    const match = /^(?:ORDER|QR)_(.+)_\d+$/.exec(trimmedPrn);
    return match?.[1] ?? null;
  }

  generateWebPaymentUrl(input: GenerateWebPaymentInput): FonepayWebPaymentResult {
    this.ensureWebConfigured();

    const callbackUrl = input.callbackUrl.trim();
    if (!callbackUrl) {
      throw new Error("Fonepay callback URL is required");
    }

    const amount = normalizeAmount(input.amount);
    const remarks1 = sanitizeRemark(input.remarks1, `Order ${input.orderId.slice(-8).toUpperCase()}`);
    const remarks2 = sanitizeRemark(input.remarks2, "RARE Atelier");
    const prn = `ORDER_${input.orderId}_${Date.now()}`;
    const date = formatPaymentDate();
    const merchantCode = this.config.merchantCode;
    const signaturePayload = `${merchantCode},P,${prn},${amount},NPR,${date},${remarks1},${remarks2},${callbackUrl}`;
    const dv = createSignature(this.config.merchantSecret, signaturePayload);

    const params = new URLSearchParams({
      PID: merchantCode,
      MD: "P",
      PRN: prn,
      AMT: amount,
      CRN: "NPR",
      DT: date,
      R1: remarks1,
      R2: remarks2,
      DV: dv,
      RU: callbackUrl,
    });

    return {
      success: true,
      prn,
      paymentUrl: `${normalizeBaseUrl(this.config.pgBaseUrl)}/api/merchantRequest?${params.toString()}`,
      amount,
    };
  }

  async verifyWebPayment(input: VerifyWebPaymentInput): Promise<FonepayWebVerificationResult> {
    this.ensureWebConfigured();

    const amount = normalizeAmount(input.amount);
    const pid = input.pid?.trim() || this.config.merchantCode;
    const bankCode = input.bankCode?.trim() || "";
    const verificationPayload = `${pid},${amount},${input.prn},${bankCode},${input.uid}`;
    const dv = createSignature(this.config.merchantSecret, verificationPayload);
    const params = new URLSearchParams({
      PRN: input.prn,
      PID: pid,
      BID: bankCode,
      AMT: amount,
      UID: input.uid,
      DV: dv,
    });

    const response = await fetch(
      `${normalizeBaseUrl(this.config.pgBaseUrl)}/api/merchantRequest/verificationMerchant?${params.toString()}`,
      { signal: AbortSignal.timeout(30_000) },
    );

    if (!response.ok) {
      throw new Error(`Fonepay verification failed with status ${response.status}`);
    }

    const xml = await response.text();
    const parsed = (await parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: true,
      trim: true,
    })) as { response?: Record<string, string> };
    const result = parsed?.response ?? {};
    const successValue = String(result.success ?? "").toLowerCase();

    return {
      success: successValue === "true" || String(result.response_code ?? "") === "0",
      responseCode: String(result.response_code ?? ""),
      message: String(result.message ?? ""),
      amount: Number.parseFloat(String(result.amount ?? amount)) || 0,
      uniqueId: String(result.uniqueId ?? ""),
      raw: result,
    };
  }

  validateWebResponse(params: ValidateWebResponseInput): true {
    this.ensureWebConfigured();

    const missing = ["PRN", "PID", "PS", "RC", "UID", "INI", "P_AMT", "R_AMT", "DV"].filter(
      (key) => !params[key as keyof ValidateWebResponseInput],
    );
    if (missing.length > 0) {
      throw new Error(`Missing Fonepay response fields: ${missing.join(", ")}`);
    }

    const payload = [
      params.PRN,
      params.PID,
      params.PS,
      params.RC,
      params.UID,
      params.BC ?? "",
      params.INI,
      params.P_AMT,
      params.R_AMT,
    ].join(",");

    const expected = createSignature(this.config.merchantSecret, payload).toUpperCase();
    if (expected !== String(params.DV).toUpperCase()) {
      throw new Error("Invalid Fonepay response signature");
    }

    return true;
  }

  async generateQrPayment(input: GenerateQrPaymentInput): Promise<FonepayQrPaymentResult> {
    this.ensureDynamicQrConfigured();

    const amount = normalizeAmount(input.amount);
    const prn = `QR_${input.orderId}_${Date.now()}`;
    const remarks1 = sanitizeRemark(input.remarks1, `Order ${input.orderId.slice(-8).toUpperCase()}`);
    const remarks2 = sanitizeRemark(input.remarks2, "RARE Atelier");
    const dataValidation = createSignature(
      this.config.merchantSecret,
      `${amount},${prn},${this.config.merchantCode},${remarks1},${remarks2}`,
    );

    const response = await fetch(
      `${normalizeBaseUrl(this.config.dynamicQrUrl)}/thirdPartyDynamicQrDownload`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          remarks1,
          remarks2,
          prn,
          merchantCode: this.config.merchantCode,
          dataValidation,
          username: this.config.username,
          password: this.config.password,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Fonepay QR generation failed with status ${response.status}`);
    }

    const qrData = (await response.json()) as unknown;

    return {
      success: true,
      prn,
      amount,
      qrPayload: extractQrPayload(qrData),
      qrData,
    };
  }

  async verifyQrPayment(prn: string): Promise<FonepayQrVerificationResult> {
    this.ensureDynamicQrConfigured();

    const dataValidation = createSignature(
      this.config.merchantSecret,
      `${prn},${this.config.merchantCode}`,
    );

    const response = await fetch(
      `${normalizeBaseUrl(this.config.dynamicQrUrl)}/thirdPartyDynamicQrGetStatus`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prn,
          merchantCode: this.config.merchantCode,
          dataValidation,
          username: this.config.username,
          password: this.config.password,
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Fonepay QR verification failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      paymentStatus?: string;
    };

    return {
      success: String(data.paymentStatus ?? "").toLowerCase() === "success",
      status: String(data.paymentStatus ?? ""),
      data,
    };
  }

  private ensureWebConfigured(): void {
    if (!this.isWebConfigured()) {
      throw new Error("Fonepay web payment is not configured");
    }
  }

  private ensureDynamicQrConfigured(): void {
    if (!this.isDynamicQrConfigured()) {
      throw new Error("Fonepay dynamic QR is not configured");
    }
  }
}

export const fonepayService = new FonepayService();
