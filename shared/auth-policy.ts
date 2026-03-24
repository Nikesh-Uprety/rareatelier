const ADMIN_PANEL_ROLES = ["admin", "owner", "manager", "staff"] as const;

export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];

export function canAccessAdminPanel(role: string | null | undefined): boolean {
  if (!role) return false;
  return ADMIN_PANEL_ROLES.includes(role.toLowerCase() as AdminPanelRole);
}

export function requiresTwoFactorChallenge(input: {
  twoFactorEnabled?: boolean | number | null;
  requires2FASetup?: boolean | null;
}): boolean {
  return !!input.twoFactorEnabled || !!input.requires2FASetup;
}

export { ADMIN_PANEL_ROLES };
