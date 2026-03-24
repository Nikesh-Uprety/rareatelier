import { and, desc, eq } from "drizzle-orm";
import { db, pool } from "../../server/db";
import { otpTokens, users } from "../../shared/schema";

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForOtpCodeByTokenId(tempToken: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const [record] = await db
      .select({ code: otpTokens.token })
      .from(otpTokens)
      .where(and(eq(otpTokens.id, tempToken), eq(otpTokens.used, 0)))
      .limit(1);

    if (record?.code) {
      return record.code;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for OTP token ${tempToken}`);
}

export async function waitForLatestOtpCodeByEmail(email: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const [record] = await db
      .select({ code: otpTokens.token })
      .from(otpTokens)
      .innerJoin(users, eq(users.id, otpTokens.userId))
      .where(and(eq(users.username, email), eq(otpTokens.used, 0)))
      .orderBy(desc(otpTokens.createdAt))
      .limit(1);

    if (record?.code) {
      return record.code;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for OTP token for ${email}`);
}

export async function getUserSecurityFlagsByEmail(email: string) {
  const [record] = await db
    .select({
      twoFactorEnabled: users.twoFactorEnabled,
      requires2FASetup: users.requires2FASetup,
    })
    .from(users)
    .where(eq(users.username, email))
    .limit(1);

  return record ?? null;
}

export async function expireOtpToken(tempToken: string) {
  await db
    .update(otpTokens)
    .set({ expiresAt: new Date(Date.now() - 60_000) })
    .where(eq(otpTokens.id, tempToken));
}

export async function closeE2EDbPool() {
  await pool.end();
}
