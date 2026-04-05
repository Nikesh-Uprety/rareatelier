import { Queue, Worker, Job } from "bullmq";
import { redis } from "../redis";
import nodemailer from "nodemailer";

// Support both direct SMTP and Railway SMTP relay (RELAY_* env vars)
const SMTP_HOST = process.env.SMTP_HOST || process.env.RELAY_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || process.env.RELAY_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || process.env.RELAY_USERNAME || "";
const SMTP_PASS = process.env.SMTP_PASS || process.env.RELAY_PASSWORD || "";

const isSMTPConfigured = SMTP_HOST && SMTP_USER && SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

if (isSMTPConfigured) {
  const isRelay = !!process.env.RELAY_HOST;
  console.log(`[Email] SMTP ${isRelay ? 'relay' : 'direct'} configured: ${SMTP_HOST}:${SMTP_PORT}`);
  
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
  });
} else {
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
    if (!transporter) {
      throw new Error("Transporter not configured");
    }

    const { to, bcc, subject, html } = job.data;

    try {
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
