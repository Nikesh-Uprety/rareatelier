# QA Review Report for Arnav

Date: 2026-04-03  
Project: `rr`  
Branch: `main`

## Purpose

This report summarizes the core product, storefront, admin, and Canvas changes completed in the recent working period so QA can validate the highest-impact flows efficiently.

## Release Scope

Recent core commits included in this report:

1. `2d27cfd` `Refine canvas preview and storefront fonts`
2. `06857a9` `Refine mobile navigation sidebar`
3. `bc2adff` `Improve admin product error handling`
4. `c3052f7` `Add performance measurement report`
5. `2285121` `Optimize storefront and admin performance`
6. `73b21b3` `Polish product gallery and mobile nav UX`
7. `446ce33` `Fix guest cart persistence and admin stock sync`
8. `42dba46` `Fix storefront nav, collection, and stock flows`

## Executive Summary

The work in this period focused on four major areas:

1. Stabilizing admin product management and improving real error feedback.
2. Repairing and polishing mobile storefront navigation.
3. Building a much more capable admin Canvas experience with live preview, template management, section editing, and global storefront font theming.
4. Improving storefront/admin operational reliability, including cart persistence, stock sync, navigation, collection behavior, and performance-oriented work.

## Core Change Areas

### 1. Admin Product Management

Delivered outcomes:

- Duplicate product-name failures now return meaningful backend conflict messages instead of generic `500` errors.
- Admin product toasts now surface real backend error messages instead of vague failure text.
- Product add and update flows were strengthened so duplicate-name errors are user-readable.
- Related admin request handling was improved so shared API calls can display cleaner error text.

QA focus:

- Add a product with a unique name.
- Add a product using an already-existing name.
- Update a product to a conflicting name.
- Confirm destructive/error toasts show the actual reason.

### 2. Storefront Mobile Navigation

Delivered outcomes:

- Mobile/tablet navigation sidebar behavior was fixed globally.
- Sidebar rendering issues caused by transformed/sticky containers were resolved.
- Mobile sidebar content was simplified to a cleaner black-and-white menu presentation.
- Logo placement, sidebar width, and logout action styling were improved.
- Sidebar usability during scroll and across page types was stabilized.

QA focus:

- Open mobile menu from homepage, products, and product detail pages.
- Scroll page before opening the menu, then verify full sidebar visibility.
- Confirm menu items remain clickable after scroll.
- Confirm logo, sidebar width, and logout button appearance match the new layout.

### 3. Admin Canvas: Live Preview, Template Catalog, and Section Workspace

Delivered outcomes:

- `Templates`, `Sections`, and `Theme` categories were reorganized into a clearer top-of-page workflow.
- Live Preview now sits directly under the template category area.
- Desktop and mobile device toggles were added to the live preview.
- Desktop preview framing was tuned so the full navbar and page width are visible at normal browser zoom.
- Mobile preview was styled with a device frame and corrected so the website display appears properly in the visible screen area.
- First-load live preview now shows branded loading treatment instead of a raw blank screen.
- Refresh now shows loader feedback instead of a silent black wait state.
- Section management was redesigned into a two-pane workspace:
  - Left side: organized section list
  - Right side: section details and editor
- `Publish Site` was added beside `Save Section` in the section editor workflow.
- Template catalog is now shown in categorized grids:
  - Premium templates
  - Free templates
- Unowned premium templates are now visually locked and blocked from activation.
- `RARE Dark Luxury` is currently treated as a locked one-time purchase template.

QA focus:

- Open Canvas and verify the top tabs show correctly.
- In `Templates`, verify live preview appears directly under the tab area.
- Toggle between desktop and mobile preview.
- Confirm first preview load shows branded loading state.
- Confirm later template switches are much faster and do not replay the heavy initial loader.
- Click `Refresh` and verify loader appears, then preview resolves cleanly.
- Confirm `RARE Dark Luxury` cannot be selected/activated if unowned.
- Confirm free templates remain selectable and activatable.
- In `Sections`, verify left list / right editor structure works correctly.
- Save a section and publish from the bottom action row.

### 4. Global Storefront Font Theme Support

Delivered outcomes:

- Storefront font presets are now centralized and reusable.
- A new `font_preset` setting was added to `site_settings`.
- Admin Canvas theme selection can now persist a global storefront font preset.
- Public storefront config now exposes the selected font preset.
- Storefront layout applies the selected preset globally across pages and sections.
- Font changes are intended to affect navbar, footer, homepage sections, product pages, and related storefront UI using the shared font variables.

QA focus:

- Change font preset in Canvas theme controls.
- Verify storefront preview updates.
- Verify storefront pages reflect the new preset after save/publish.
- Check homepage, navbar, footer, products, and product detail pages.

### 5. Reliability and Performance Work From the Same Period

Delivered outcomes from adjacent commits in this same working window:

- Guest cart persistence issues were addressed.
- Admin stock synchronization was improved.
- Storefront navigation, collection flows, and stock-related behavior were fixed.
- Product gallery and mobile navigation UX were polished further.
- Storefront and admin performance optimizations were added.
- A performance measurement report was added to support verification.

QA focus:

- Guest cart survives refresh/login/logout transitions as expected.
- Stock changes remain consistent between admin and storefront.
- Product gallery interactions are stable on mobile.
- Navigation between storefront pages remains smooth after the recent performance and routing work.

## Database / Deployment Notes

This period introduced a database migration related to storefront font settings:

- `migrations/0004_add_site_settings_font_preset.sql`

Deployment note:

- Production should apply this migration before or during rollout of the latest Canvas/storefront font work.

## Recommended QA Test Pass

### High Priority

1. Admin product create/update duplicate-name handling
2. Mobile storefront menu behavior across key storefront pages
3. Canvas live preview on desktop and mobile
4. Canvas section editor left/right workspace behavior
5. Locked premium template behavior for `RARE Dark Luxury`
6. Global storefront font preset persistence and rendering

### Medium Priority

1. Guest cart persistence
2. Inventory/admin stock sync
3. Product gallery interactions
4. Refresh behavior in Canvas live preview

## Known Risk Areas

- Canvas preview relies on iframe-based storefront rendering and can still be sensitive to slower environments.
- Font updates depend on shared CSS variable usage across storefront components; areas not using shared font variables may need follow-up.
- Premium ownership logic is currently UI-enforced for the locked template experience and should still be validated against expected product/business rules.

## Suggested QA Sign-off Notes

If the following pass, this period’s work can be considered stable for review:

- Admin product errors are human-readable.
- Mobile menu works consistently across storefront pages.
- Canvas live preview works on both desktop and mobile.
- Section editing workflow is usable and publishable.
- Locked template behavior is clear and enforced in the UI.
- Global font preset changes correctly propagate across storefront pages.

