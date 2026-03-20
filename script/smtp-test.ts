/**
 * Quick SMTP check: verify connection + send one test message.
 * Usage: npx tsx script/smtp-test.ts [recipient@email.com]
 * Loads .env from repo root (same vars as server/email.ts).
 */
import "dotenv/config";
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
// Match server/email.ts defaults
const SENDER_EMAIL = process.env.SENDER_EMAIL || "upretynikesh021@gmail.com";
const SENDER_NAME = process.env.SENDER_NAME || "RARE Nepal";

async function main() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment (.env).");
    process.exit(1);
  }

  const recipient = process.argv[2] || SENDER_EMAIL;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  console.log(`Testing SMTP: ${SMTP_HOST}:${SMTP_PORT} as user ${SMTP_USER.slice(0, 6)}…`);
  console.log(`From: "${SENDER_NAME}" <${SENDER_EMAIL}>`);
  console.log(`To:   ${recipient}`);

  try {
    await transporter.verify();
    console.log("OK: verify() — server accepted credentials.");
  } catch (e: any) {
    console.error("FAIL: verify()", e?.message || e);
    process.exit(1);
  }

  try {
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: recipient,
      subject: `[SMTP test] RARE — ${new Date().toISOString()}`,
      text: "If you see this, SMTP is working.",
      html: "<p>If you see this, <strong>SMTP is working</strong>.</p>",
    });
    console.log("OK: sendMail —", info.messageId || "sent");
    console.log("Check inbox (and spam) for:", recipient);
  } catch (e: any) {
    console.error("FAIL: sendMail", e?.message || e);
    if (e?.response) console.error("Server response:", e.response);
    process.exit(1);
  }
}

main();
