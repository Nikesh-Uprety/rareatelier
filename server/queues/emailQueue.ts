import { Queue, Worker, Job } from "bullmq";
import { redis } from "../redis";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { lookup } from "node:dns/promises";

// Support both direct SMTP and Railway SMTP relay (RELAY_* env vars)
const SMTP_HOST = process.env.SMTP_HOST || process.env.RELAY_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || process.env.RELAY_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || process.env.RELAY_USERNAME || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.RELAY_PASSWORD || "";

const isSMTPConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS;

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (!isSMTPConfigured) {
    throw new Error("Transporter not configured");
  }

  if (!transporterPromise) {
    const isRelay = !!process.env.RELAY_HOST;
    console.log(`[Email] SMTP ${isRelay ? 'relay' : 'direct'} configured: ${SMTP_HOST}:${SMTP_PORT}`);

    transporterPromise = (async () => {
      let resolvedHost = SMTP_HOST;

      try {
        const resolved = await lookup(SMTP_HOST, { family: 4 });
        resolvedHost = resolved.address;
      } catch (error) {
        console.warn(`[Email] IPv4 lookup failed for ${SMTP_HOST}, using original host`, error);
      }

      const smtpOptions: SMTPTransport.Options = {
        host: resolvedHost,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
          servername: SMTP_HOST,
        },
      };

      return nodemailer.createTransport(smtpOptions);
    })();
  }

  return transporterPromise;
}

if (!isSMTPConfigured) {
  console.warn("[Email] No SMTP configured - emails will not be sent");
}

const SENDER_EMAIL = process.env.SENDER_EMAIL || "upretynikesh021@gmail.com";
const SENDER_NAME = process.env.SENDER_NAME || "RARE Nepal";

export const emailQueue = new Queue("emailQueue", {
  connection: redis,
});

export const emailWorker = new Worker(
  "emailQueue",
  async (job: Job) => {
    const { to, bcc, subject, html } = job.data;

    try {
      const transporter = await getTransporter();
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to,
        bcc,
        subject,
        html,
      });
      console.log(`[Queue] Email sent: ${subject} to ${to || bcc}`);
    } catch (err: any) {
      console.error(`[Queue] Email failed: ${subject}`, err);
      throw err; // Allow BullMQ to retry
    }
  },
  {
    connection: redis,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[Queue] Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Queue] Job ${job?.id} failed with ${err.message}`);
});
