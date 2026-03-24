import { describe, expect, it } from "vitest";
import { canAccessAdminPanel, requiresTwoFactorChallenge } from "@shared/auth-policy";

describe("auth policy", () => {
  it("allows the intended admin panel roles", () => {
    expect(canAccessAdminPanel("admin")).toBe(true);
    expect(canAccessAdminPanel("owner")).toBe(true);
    expect(canAccessAdminPanel("manager")).toBe(true);
    expect(canAccessAdminPanel("staff")).toBe(true);
    expect(canAccessAdminPanel("ADMIN")).toBe(true);
    expect(canAccessAdminPanel("csr")).toBe(false);
    expect(canAccessAdminPanel("customer")).toBe(false);
    expect(canAccessAdminPanel(undefined)).toBe(false);
  });

  it("requires a two-factor challenge for first-time setup or enabled 2FA", () => {
    expect(requiresTwoFactorChallenge({ twoFactorEnabled: true, requires2FASetup: false })).toBe(true);
    expect(requiresTwoFactorChallenge({ twoFactorEnabled: false, requires2FASetup: true })).toBe(true);
    expect(requiresTwoFactorChallenge({ twoFactorEnabled: 1, requires2FASetup: false })).toBe(true);
    expect(requiresTwoFactorChallenge({ twoFactorEnabled: 0, requires2FASetup: false })).toBe(false);
  });
});
