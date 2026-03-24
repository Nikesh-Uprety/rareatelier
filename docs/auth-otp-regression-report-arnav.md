# RARE.NP Auth and OTP Regression Report

Date: March 24, 2026  
Prepared for: Arnav review  
Scope: internal user auth hardening, first-login 2FA onboarding, OTP resend recovery, and regression coverage stabilization

## Summary

This phase focused on securing and stabilizing the internal admin/store-user authentication flow.

The main outcomes:
- first-login 2FA setup is now enforced for newly created internal users
- OTP codes are no longer leaked in login API responses
- plaintext passwords are no longer emailed to created store users
- role gating is aligned across backend and frontend for admin-panel access
- browser regression coverage now includes first-login OTP onboarding and expired-code resend recovery
- Playwright E2E runs were stabilized by removing SMTP delivery as a blocking factor in test mode

## Core Code Changes

### 1. First-login 2FA setup support
- Added `requires_2fa_setup` to the user model in [schema.ts](/home/nikesh/rr/shared/schema.ts)
- Added tracked migration in [0001_add_requires_2fa_setup.sql](/home/nikesh/rr/migrations/0001_add_requires_2fa_setup.sql)
- Wired the flag through auth/session/storage logic in:
  - [auth.ts](/home/nikesh/rr/server/auth.ts)
  - [storage.ts](/home/nikesh/rr/server/storage.ts)
  - [authHandlers.ts](/home/nikesh/rr/server/authHandlers.ts)

Behavior:
- newly created store users are marked as requiring 2FA setup
- first successful credential login returns a 2FA challenge instead of full admin access
- successful OTP verification enables 2FA and clears the setup flag

### 2. Auth response hardening
- Removed OTP code leakage from login responses in [authHandlers.ts](/home/nikesh/rr/server/authHandlers.ts)
- Replaced debug-style auth failure responses with generic auth failure messaging

Behavior:
- login response includes `requires2FA`, `tempToken`, and `requires2FASetup`
- OTP code is delivered only through the OTP flow, not the API response

### 3. Store-user onboarding security cleanup
- Removed plaintext password sending from store-user welcome email in [email.ts](/home/nikesh/rr/server/email.ts)
- Updated create-store-user flow in [authHandlers.ts](/home/nikesh/rr/server/authHandlers.ts)
- Updated admin UI messaging in [StoreUsers.tsx](/home/nikesh/rr/client/src/pages/admin/StoreUsers.tsx)

Behavior:
- internal users still receive a welcome/setup email
- password must be shared through a separate secure channel
- onboarding relies on first-login OTP verification rather than password-in-email

### 4. Role-policy alignment
- Added shared role helpers in [auth-policy.ts](/home/nikesh/rr/shared/auth-policy.ts)
- Applied those rules in:
  - [requireAdmin.ts](/home/nikesh/rr/server/middleware/requireAdmin.ts)
  - [Login.tsx](/home/nikesh/rr/client/src/pages/auth/Login.tsx)
  - [ProtectedRoute.tsx](/home/nikesh/rr/client/src/components/ProtectedRoute.tsx)

Behavior:
- `admin`, `owner`, `manager`, and `staff` are treated as admin-panel roles
- protected admin routes use shared authorization logic

### 5. OTP resend recovery
- Adjusted OTP refresh behavior in [storage.ts](/home/nikesh/rr/server/storage.ts)

Behavior:
- expired OTP codes are still rejected by verification
- resend now refreshes an unused OTP session even if the old code expired
- users can recover through the resend button instead of being stranded with an expired code

### 6. E2E reliability improvements
- Added test-mode email short-circuiting in [email.ts](/home/nikesh/rr/server/email.ts)
- Removed Playwright onboarding dependency on shared auth setup in [playwright.config.ts](/home/nikesh/rr/playwright.config.ts)
- Added DB-backed test helpers in [db.ts](/home/nikesh/rr/tests/e2e/db.ts)

Behavior:
- Playwright onboarding tests no longer depend on live SMTP timing
- onboarding tests manage their own login/session state
- OTP verification remains real; only delivery is skipped in `E2E_TEST_MODE=1`

## Automated Tests Added or Extended

### Unit and route-contract coverage
- [auth-policy.test.ts](/home/nikesh/rr/tests/unit/auth-policy.test.ts)
- [server-auth.test.ts](/home/nikesh/rr/tests/unit/server-auth.test.ts)
- [require-admin.test.ts](/home/nikesh/rr/tests/unit/require-admin.test.ts)
- [auth-handlers.test.ts](/home/nikesh/rr/tests/unit/auth-handlers.test.ts)

Covered:
- bcrypt-based login behavior
- role propagation and route-guard decisions
- first-login 2FA challenge contract
- duplicate email rejection
- invalid store-user payload rejection
- OTP verification clearing `requires_2fa_setup`
- non-2FA login success path

### Browser E2E coverage
- [admin.spec.ts](/home/nikesh/rr/tests/e2e/admin.spec.ts)
- [admin-onboarding.spec.ts](/home/nikesh/rr/tests/e2e/admin-onboarding.spec.ts)

Covered:
- admin payment verification and product CRUD
- first-login OTP setup flow
- expired OTP rejection
- resend OTP and fresh-code recovery

## Latest Verified Results

### Type and unit verification
- `npm run check` -> passed
- `npm run test:unit` -> passed previously with all auth additions in place

### Browser verification
- `PLAYWRIGHT_USE_EXISTING=1 PORT=5001 npx playwright test tests/e2e/admin-onboarding.spec.ts`
  - Result: `2 passed`
- `PLAYWRIGHT_USE_EXISTING=1 PORT=5000 npx playwright test tests/e2e/admin.spec.ts`
  - Result: passed during earlier targeted admin regression verification

High-confidence confirmed browser behaviors:
- new internal users are forced into OTP setup before admin access
- OTP verify enables access and clears setup state
- expired OTP is rejected
- resend produces a fresh OTP and completes login successfully
- admin payment verification flow works
- admin product create/edit/delete flow works

## Manual Verification Checklist For Arnav

### Auth and onboarding
1. Create a new store user from `/admin/store-users`
2. Log out of the admin account
3. Log in using the new store user credentials
4. Confirm the user is taken to OTP verification instead of the admin dashboard
5. Confirm no OTP code appears in the network login response
6. Complete OTP verification
7. Confirm the user lands in `/admin`

### Expired-code recovery
1. Start login for a newly created store user
2. Wait until the first OTP expires, or force expiration in a controlled environment
3. Enter the expired code
4. Confirm the app rejects it
5. Use resend
6. Confirm a fresh code works and the user reaches the admin panel

### Role access
1. Log in as `staff`
2. Confirm admin routes intended for internal operations are accessible
3. Confirm truly restricted routes still honor backend middleware
4. Spot-check that customer-level or non-admin roles are not granted admin access

### Store-user creation
1. Create another store user with a unique email
2. Confirm creation succeeds
3. Confirm no plaintext password is included in the welcome email content
4. Confirm first login still requires OTP setup

## Risks / Notes

- The E2E test mode skips outbound email delivery only for automated browser runs. Production behavior is unchanged.
- The strongest remaining improvement would be replacing admin-shared passwords with a proper invite or set-password flow.
- The dedicated E2E server approach is recommended for CI because it avoids collisions with an existing local dev server.

## Recommended Reviewer Commands

### Type check
```bash
npm run check
```

### Onboarding verification
```bash
PLAYWRIGHT_USE_EXISTING=1 PORT=5001 npx playwright test tests/e2e/admin-onboarding.spec.ts
```

### Admin regression verification
```bash
PLAYWRIGHT_USE_EXISTING=1 PORT=5001 npx playwright test tests/e2e/admin.spec.ts
```

## Bottom Line

The core auth/security issues found in this phase are fixed:
- OTP is no longer leaked
- first-login 2FA setup is enforced
- plaintext password email was removed
- expired-code resend now works
- admin role gating is more consistent

The important automated coverage is now in place, and the OTP onboarding flow is verified end to end for manual review.
