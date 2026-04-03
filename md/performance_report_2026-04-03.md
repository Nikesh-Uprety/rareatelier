# RARE.NP Performance Report

Date: 2026-04-03

## Summary

This report captures the current performance optimization state of the RARE.NP storefront and admin experience after the recent optimization pass. The goal was to preserve existing functionality and visual behavior while reducing route payloads, deferring heavy admin-only features, and improving production load metrics across the main buyer flow.

## Build Outcome

- Production build command: `npm run build`
- Typecheck command: `npx tsc --noEmit --pretty false`
- Both commands passed successfully.

### Current production build highlights

- Main shared bundle: `355.01 kB`
- Global CSS: `326.35 kB`
- Home route chunk: `26.62 kB`
- Product detail route chunk: `31.16 kB`
- Admin products route chunk: `95.21 kB`
- Dashboard route chunk: `15.02 kB`
- Deferred dashboard charts chunk: `3.25 kB`

### Remaining large deferred chunks

- `charts`: `443.65 kB`
- `pdf-jspdf`: `387.03 kB`
- `pdf-html2canvas`: `201.04 kB`
- `ui-overlays`: `97.66 kB`

These are still large, but they are now pushed behind route boundaries or user actions rather than inflating the storefront’s initial path.

## Optimization Work Completed

### Storefront

- Home page moved to lazy route loading.
- Below-the-fold home sections now load progressively instead of all at once.
- Shared page config fetch was unified and cached more effectively.
- Product detail defers the size guide until it is opened.
- Fresh release product fetching was reduced so it no longer requests oversized datasets.
- Unnecessary auth refetch on window focus was removed for normal browsing.
- Guest cart and storefront behavior remain unchanged functionally.

### Admin

- Bill viewer is loaded on demand instead of eagerly in multiple admin pages.
- Attributes manager is lazy-loaded and its PDF/image export libraries are imported only when export is used.
- Dashboard charts were split into a deferred chunk.
- Admin shell and bill-viewer CSS were moved out of the global stylesheet.

### Build pipeline

- Production sourcemaps are off by default.
- Image minification is now optional and only runs when explicitly enabled with `BUILD_IMAGE_MINIFY=true`.
- Shared UI was split into smaller chunks: `ui-core`, `ui-navigation`, `ui-forms`, `ui-overlays`, and `icons`.

## Runtime Measurement

The following measurements were collected from a local production run using Chromium-based browser automation against `http://127.0.0.1:5000`.

### Homepage

- URL: `/`
- FCP: `0.96s`
- LCP: `2.18s`
- CLS: `0.00`

### Products listing

- URL: `/products`
- FCP: `0.89s`
- LCP: `1.51s`
- CLS: `0.00`

### Product detail

- URL: `/product/9bf97ff2-802c-4b35-8b65-8a2028383bdb`
- FCP: `0.52s`
- LCP: `0.91s`
- CLS: `0.00`

### Cart

- URL: `/cart`
- FCP: `0.65s`
- LCP: `1.03s`
- CLS: `0.00006`

### Checkout

- URL: `/checkout`
- FCP: `0.43s`
- LCP: `0.74s`
- CLS: `0.00`

## Modern Web Performance Assessment

Using practical Core Web Vitals style thresholds:

- Good LCP target: under `2.5s`
- Good CLS target: under `0.1`
- Good FCP target: under `1.8s`

### Result

The measured storefront flow is in a solid modern-performance range:

- All measured pages are under the `2.5s` LCP target.
- Layout stability is excellent, with CLS effectively at zero.
- First contentful paint is comfortably within modern expectations.

The homepage is the heaviest measured storefront page, but it still remains within a good range.

## Limitations

- Lighthouse itself could not attach to Chromium in this environment, so browser-based Puppeteer timing was used instead.
- These measurements are local-production measurements, not throttled public-network lab scores.
- Real-world metrics on lower-end phones or slower networks may be worse than the local desktop measurements reported here.

## Recommended Next Steps

1. Run a formal Lighthouse or PageSpeed audit in the deployment environment.
2. Measure mobile-throttled performance for the homepage and products page.
3. Continue trimming the large chart and PDF export dependency paths if admin responsiveness becomes a priority.
4. Audit the remaining global CSS if further storefront improvements are needed.

## Conclusion

The website is now meaningfully more optimized than before, while keeping the same page functionality and user-facing behavior. The main storefront buyer flow currently performs at a good modern level based on local production browser measurements.
