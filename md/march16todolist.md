# To-Do List: March 16, 2026
**Project:** Rare Atelier Admin System Refinement

## Priority: High (Critical Stability & Launch)
- [ ] **Production Build Verification**: Run `npm run build` to ensure all latest UI changes and Lucide icon fixes compile correctly for production.
- [ ] **End-to-End POS Stress Test**: Perform 5+ consecutive transactions with various payment methods to ensure session management and receipt generation remain stable.
- [ ] **Database Migration Audit**: Verify all environments (development/staging/production) have the `newsletter_subscribers.status` column synced.

## Priority: Medium (Feature Enhancement & UX)
- [ ] **SMS Notification Integration**: Begin Phase 7.9 implementation for customer SMS alerts on successful orders (as outlined in the roadmap).
- [ ] **Marketing CSV Validation**: Add more robust front-end validation for subscriber CSV uploads to handle malformed email addresses or empty rows better.
- [ ] **Analytics Query Optimization**: Review and index the database for the new `revenueByDay` and `topProducts` queries to ensure performance stays fast as data grows.

## Priority: Low (Maintenance & Refactoring)
- [ ] **Code Refactoring**: Break down `client/src/pages/admin/POS.tsx` into smaller sub-components (e.g., `CartSidebar.tsx`, `ProductGrid.tsx`) for better maintainability.
- [ ] **Unit Testing**: Implement basic Jest/Vitest tests for the new soft-delete methods in `server/storage.ts`.
- [ ] **Documentation Update**: Update the internal API documentation to reflect the new newsletter status endpoints.

---
*Created by Antigravity AI on March 15, 2026.*
