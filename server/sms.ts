import "dotenv/config";

const isE2ETestMode = process.env.E2E_TEST_MODE === "1";
const SMS_PROVIDER = (process.env.SMS_PROVIDER || "twilio").toLowerCase();

type SmsStatus = {
  provider: string;
  configured: boolean;
  missing: string[];
};

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() || "";
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim() || "";

  const missing: string[] = [];
  if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!fromNumber) missing.push("TWILIO_FROM_NUMBER");

  return {
    accountSid,
    authToken,
    fromNumber,
    configured: missing.length === 0,
    missing,
  };
}

function normalizePhoneNumber(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1).replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

export function getSmsChannelStatus(): SmsStatus {
  if (SMS_PROVIDER !== "twilio") {
    return {
      provider: SMS_PROVIDER,
      configured: false,
      missing: ["Unsupported SMS_PROVIDER (only 'twilio' is supported right now)"],
    };
  }

  const twilio = getTwilioConfig();
  return {
    provider: "twilio",
    configured: twilio.configured,
    missing: twilio.missing,
  };
}

export async function sendMarketingSMS(
  recipients: string[],
  message: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return { sent: 0, failed: recipients.length, errors: ["Message is empty"] };
  }

  const normalizedRecipients = Array.from(
    new Set(
      recipients
        .map((phone) => normalizePhoneNumber(phone))
        .filter((phone): phone is string => !!phone),
    ),
  );

  if (normalizedRecipients.length === 0) {
    return {
      sent: 0,
      failed: recipients.length,
      errors: ["No valid phone numbers found"],
    };
  }

  if (isE2ETestMode) {
    console.log("[E2E] Skipping SMS send", {
      recipients: normalizedRecipients.length,
      preview: trimmedMessage.slice(0, 80),
    });
    return { sent: normalizedRecipients.length, failed: 0, errors: [] };
  }

  if (SMS_PROVIDER !== "twilio") {
    return {
      sent: 0,
      failed: normalizedRecipients.length,
      errors: ["Unsupported SMS provider"],
    };
  }

  const twilio = getTwilioConfig();
  if (!twilio.configured) {
    return {
      sent: 0,
      failed: normalizedRecipients.length,
      errors: [`SMS not configured (${twilio.missing.join(", ")})`],
    };
  }

  const authHeader = `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString("base64")}`;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const to of normalizedRecipients) {
    try {
      const body = new URLSearchParams({
        From: twilio.fromNumber,
        To: to,
        Body: trimmedMessage,
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        failed += 1;
        errors.push(`SMS to ${to} failed (${response.status}): ${text.slice(0, 180)}`);
        continue;
      }

      sent += 1;
    } catch (err: any) {
      failed += 1;
      errors.push(`SMS to ${to} failed: ${err?.message || "Unknown error"}`);
    }
  }

  return { sent, failed, errors };
}

