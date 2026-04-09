# Storefront Core Changes Report

Date: 2026-04-09  
Project: Rare Atelier storefront (`stuffyclone` / active storefront template)  
Prepared by: Codex

## Executive Summary

Today’s work focused on stabilizing and refining the active storefront experience across the landing page, products page, individual product page, Atelier/services pages, shared navigation, and theme behavior.

The overall result is a cleaner storefront with:

- a more controlled landing-page presentation
- improved light and dark theme consistency
- simpler and clearer navigation patterns
- corrected service, FAQ, and customer-care routing/content
- better product browsing and gallery behavior
- refreshed service-page visuals

## Core Changes Completed

### 1. Landing Page

- Removed the extra footer and prevented the landing page from behaving like a long scrolling page.
- Restored the landing page as a more static hero-first screen.
- Replaced the landing menu item `Admin` with `Support`, linked to the Atelier contact section.
- Restored the previous style of centered landing-page menu items under the brand mark.
- Reintroduced the background image and removed heavy image filtering so the hero image stays closer to the original.
- Brightened the hero presentation and tuned the center panel blur/transparency multiple times for better readability.
- Removed outer circular backgrounds from social icons so the icons appear cleaner.
- Added the requested Rare Atelier logo asset above the centered menu and later replaced it with the exact provided logo file.
- Hid the small top navbar logo on the landing page because the center logo already carries the brand identity.
- Ensured the landing navbar itself stays visually clean with no blur/filter overlay over the hero image.
- Restored the hover bar animation on the `Menu` button.
- Adjusted landing light-mode visibility so center menu items and social icons remain legible over the image using a stable bright/glow treatment.
- Simplified the landing search appearance in light mode so it feels transparent and minimal.

### 2. Shared Navigation / Sidebar

- Reworked the storefront navbar to stay visible and fixed across storefront pages.
- Updated the layout so the `Menu` control sits at the true far left and the right-side actions sit at the far right responsively.
- Reintroduced a landing-style top-left menu and top-right action layout on the products page.
- Replaced the old theme switch with an MUI-based icon switch while preserving existing theme behavior.
- Updated dark-mode nav/logo treatment so logo and nav text display correctly in white.
- Adjusted the light-mode sidebar panel to use a true white surface with dark text/icons.
- Replaced drawer header text with the Rare Atelier logo image beside the close button.
- Hid `Our Services` and `Customer Care` from the storefront sidebar menu while keeping the rest of the menu intact.

### 3. Products Page

- Applied the landing-style navbar treatment to the shop/products page.
- Kept the top navbar fixed and always visible.
- Tuned the navbar glass behavior on image-heavy/product contexts to reduce opacity and improve visual balance.
- Changed the initial `All Products` load behavior to display 16 items with bottom pagination preserved.
- Kept the storefront products layout in a 4-column desktop grid feel for the active template.
- Reduced the visual dominance of product imagery in cards so the cards feel more balanced.
- Fixed dark-mode category hover behavior.
- Fixed dark-mode visibility for the `Sort By` and related filter dropdowns by giving native selects an explicit dark surface.
- Removed strong/red border styling from `More` and `Sort By` controls where requested.

### 4. Individual Product Page

- Removed the top-left breadcrumb from the active-template product page to reduce visual noise.
- Removed the top-right `Back to shop` action.
- Simplified the image counter presentation to `01 / 02` style only.
- Moved color selection higher so it aligns better with the product name and header content.
- Made product name and price styling bolder/clearer.
- Updated color swatch behavior so image-based color options show the image first, with a color-only fallback when no image exists.
- Adjusted mobile ordering so images are prioritized for easier product browsing.
- Refined fullscreen gallery behavior multiple times:
  - moved the close control away from conflicting navbar areas
  - fixed clickability issues caused by overlap/stacking
  - placed the close button below the center logo area
  - ensured the button remains fixed and reliably closes the gallery

### 5. Atelier / Services / FAQ / Customer Care Pages

- Fixed the Atelier page hero/background issue so the section no longer appears visually broken.
- Created a cleaner simple-hero structure for missing or incomplete storefront support pages.
- Added a basic FAQ page using the previous FAQ content.
- Added a Customer Care page using the current support/contact structure.
- Removed duplicate support/contact intro copy from the Customer Care page.
- Removed duplicate contact-intro content below the Atelier services section.
- Refreshed the `Made In Nepal` service card with the requested badge image inside a padded circular presentation.
- Removed the photo background from the services section and returned it to a cleaner themed visual treatment with the dark mountain-style aesthetic.

### 6. Loaders and Visual Polish

- Reverted the loader animation back to the cleaner official-style branded loading experience.
- Improved multiple light/dark mode transitions across storefront pages so non-landing pages use a cleaner white light mode and a softer dark mode.
- Tuned logo behavior so light mode keeps a dark logo on white surfaces, while dark mode uses a white/glow treatment where needed.

## Files Most Directly Impacted

- `client/src/components/layout/Navbar.tsx`
- `client/src/components/layout/SearchBar.tsx`
- `client/src/components/ui/theme-toggler-button.tsx`
- `client/src/components/ui/BrandedLoader.tsx`
- `client/src/pages/storefront/Home.tsx`
- `client/src/pages/storefront/Products.tsx`
- `client/src/pages/storefront/ProductDetail.tsx`
- `client/src/pages/storefront/Contact.tsx`
- `client/src/pages/storefront/LegalPlaceholder.tsx`
- `client/src/components/home/OurServices.tsx`
- `client/public/images/newproductpagelogo-removebg-preview.png`
- `client/public/images/made-in-nepal-badge.jpg`

## Commits Delivered Today

- `deefbd2` - Refine storefront UX and admin updates
- `68b65ac` - Fix product gallery close action and customer care layout
- `7f05aae` - Update services visuals and atelier layout
- `8f0bf8d` - Refine storefront navigation and gallery controls

## Verification Completed

- `npm run build` was run repeatedly after the major storefront patches and passed.
- Manual iteration covered landing page, products page, product detail gallery, services pages, FAQ/customer care pages, theme toggle behavior, and sidebar navigation.

## Performance / Optimization Notes

Based on the latest production build:

- Main CSS bundle is roughly `399 kB`.
- Main JS entry bundle is roughly `453 kB`.
- Large secondary chunks still include MUI, charts, and PDF-related libraries.

Current performance observations:

- The storefront-specific UI fixes are stable and build-clean.
- The codebase still carries large shared bundles that are not caused by today’s visual patches alone.
- Best next optimization opportunities are:
  - lazy-load PDF/export tooling
  - lazy-load heavy admin/chart modules
  - further split large shared vendor bundles
  - review global CSS scope and weight

## Final Outcome

The storefront is now significantly more aligned with the requested Rare Atelier presentation:

- cleaner landing experience
- stronger brand consistency
- more usable fixed navigation
- better theme behavior
- more polished products browsing
- corrected support/service page structure
- stabilized gallery interactions

This report captures the core storefront-facing work completed on 2026-04-09.
