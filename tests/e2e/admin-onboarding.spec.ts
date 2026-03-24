import { test, expect } from "@playwright/test";
import {
  closeE2EDbPool,
  expireOtpToken,
  getUserSecurityFlagsByEmail,
  waitForOtpCodeByTokenId,
} from "./db";
import { loginAsAdmin } from "./helpers";

test.afterAll(async () => {
  await closeE2EDbPool();
});

test("new store user completes first-login OTP setup before admin access", async ({ page }) => {
  test.setTimeout(180_000);

  const uniqueEmail = `staff-onboarding-${Date.now()}@example.com`;
  const password = "TestPass123!";

  await loginAsAdmin(page);
  await page.goto("/admin/store-users");
  await expect(page.getByRole("heading", { name: "Store Users" })).toBeVisible();
  await page.getByRole("button", { name: "Add User" }).click();
  await expect(page.getByRole("heading", { name: "Add Team Member" })).toBeVisible();
  await page.locator("#store-user-name").fill("Onboarding Staff");
  await page.locator("#store-user-email").fill(uniqueEmail);
  await page.locator("#store-user-password").fill(password);
  await page.getByRole("button", { name: "Add User" }).last().click();
  await expect(page.getByText(uniqueEmail).first()).toBeVisible();

  const logoutResponse = await page.request.post("/api/auth/logout");
  expect(logoutResponse.ok()).toBeTruthy();

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(uniqueEmail);
  await page.getByTestId("login-password").fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/login") && response.request().method() === "POST",
  );

  await page.getByTestId("login-submit").click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const loginPayload = await loginResponse.json();
  expect(loginPayload.success).toBe(true);
  expect(loginPayload.requires2FA).toBe(true);
  expect(loginPayload.requires2FASetup).toBe(true);
  expect(loginPayload.code).toBeUndefined();
  expect(typeof loginPayload.tempToken).toBe("string");

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);

  const otpCode = await waitForOtpCodeByTokenId(loginPayload.tempToken as string);
  for (const [index, digit] of otpCode.split("").entries()) {
    await page.locator(`#otp-${index}`).fill(digit);
  }

  await page.getByRole("button", { name: "Verify Code" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const meResponse = await page.request.get("/api/auth/me");
  expect(meResponse.ok()).toBeTruthy();
  const mePayload = await meResponse.json();
  expect(mePayload.data.role).toBe("staff");

  const securityFlags = await getUserSecurityFlagsByEmail(uniqueEmail);
  expect(securityFlags).not.toBeNull();
  expect(Boolean(securityFlags?.twoFactorEnabled)).toBe(true);
  expect(Boolean(securityFlags?.requires2FASetup)).toBe(false);
});

test("expired OTP is rejected and resend issues a fresh code that works", async ({ page }) => {
  test.setTimeout(180_000);

  const uniqueEmail = `staff-expired-${Date.now()}@example.com`;
  const password = "TestPass123!";

  await loginAsAdmin(page);
  await page.goto("/admin/store-users");
  await expect(page.getByRole("heading", { name: "Store Users" })).toBeVisible();
  await page.getByRole("button", { name: "Add User" }).click();
  await expect(page.getByRole("heading", { name: "Add Team Member" })).toBeVisible();
  await page.locator("#store-user-name").fill("Expired OTP Staff");
  await page.locator("#store-user-email").fill(uniqueEmail);
  await page.locator("#store-user-password").fill(password);
  await page.getByRole("button", { name: "Add User" }).last().click();
  await expect(page.getByText(uniqueEmail).first()).toBeVisible();

  const logoutResponse = await page.request.post("/api/auth/logout");
  expect(logoutResponse.ok()).toBeTruthy();

  await page.goto("/admin/login");
  await page.getByTestId("login-email").fill(uniqueEmail);
  await page.getByTestId("login-password").fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/login") && response.request().method() === "POST",
  );

  await page.getByTestId("login-submit").click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const loginPayload = await loginResponse.json();
  expect(loginPayload.success).toBe(true);
  expect(loginPayload.requires2FA).toBe(true);
  expect(typeof loginPayload.tempToken).toBe("string");

  const tempToken = loginPayload.tempToken as string;
  const expiredCode = await waitForOtpCodeByTokenId(tempToken);
  await expireOtpToken(tempToken);

  for (const [index, digit] of expiredCode.split("").entries()) {
    await page.locator(`#otp-${index}`).fill(digit);
  }

  const verifyExpiredPromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/verify-2fa") && response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "Verify Code" }).click();

  const verifyExpiredResponse = await verifyExpiredPromise;
  expect(verifyExpiredResponse.status()).toBe(400);
  const verifyExpiredPayload = await verifyExpiredResponse.json();
  expect(verifyExpiredPayload.error).toBe("Invalid or expired code");
  await expect(page).toHaveURL(/\/admin\/login$/);

  const resendResponse = await page.request.post("/api/auth/resend-otp", {
    data: { tempToken },
  });
  expect(resendResponse.ok()).toBeTruthy();
  const resendPayload = await resendResponse.json();
  expect(resendPayload.success).toBe(true);

  const freshCode = await waitForOtpCodeByTokenId(tempToken);
  expect(freshCode).not.toBe(expiredCode);

  for (const [index, digit] of freshCode.split("").entries()) {
    await page.locator(`#otp-${index}`).fill(digit);
  }

  await page.getByRole("button", { name: "Verify Code" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const securityFlags = await getUserSecurityFlagsByEmail(uniqueEmail);
  expect(securityFlags).not.toBeNull();
  expect(Boolean(securityFlags?.twoFactorEnabled)).toBe(true);
  expect(Boolean(securityFlags?.requires2FASetup)).toBe(false);
});
