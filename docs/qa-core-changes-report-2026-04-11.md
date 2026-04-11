# QA Core Changes Report

Date: 2026-04-11
Project: Rare Atelier storefront and admin
Audience: QA team
Report type: Non-technical release summary

## Executive Summary

This update focused on three business-critical areas:

- making the order flow safer for unusually large first-time purchases
- tightening customer privacy and guest-order access
- stabilizing the new Pages builder and publishing flow for superadmin users

The main outcome is that the platform now does a better job of protecting high-risk orders, keeping order details private to the correct buyer session, and supporting live page-building without the blank-page and publish issues that were previously appearing.

## Core Changes Completed

### 1. Large first-time orders now require email verification

- New visitors who try to place an order with more than 5 items are no longer allowed to complete that purchase immediately.
- They now receive an email code and must verify the purchase before the order can be placed.
- This adds a practical fraud-prevention step without slowing down normal shoppers.

### 2. Trusted repeat customers are not unnecessarily blocked

- Customers with a real purchase history are treated differently from brand-new visitors.
- If a customer already has at least 5 previous orders, they can still place larger orders without being forced through the extra verification step.
- This keeps the experience smoother for legitimate repeat buyers.

### 3. Guest order privacy has been tightened

- Order details, payment follow-up actions, and related guest-order steps are now more tightly tied to the correct buyer session.
- This reduces the risk of one guest user opening or acting on another guest user's order.
- In practical terms, order follow-up behavior is now safer and more consistent.

### 4. Admin and Canvas routes were stabilized

- Admin pages, including the Canvas area, were fixed so they load more reliably.
- The Pages builder no longer falls into the earlier white-screen or stuck-loading behavior that was blocking proper testing.
- This makes the customization area more dependable for superadmin users.

### 5. Pages builder flow is now working end to end

- A superadmin can now create a draft page, open the dedicated builder, add sections, move sections, delete sections, publish the page, and confirm that the public page reflects the saved content.
- The builder flow now behaves like a real working editing tool instead of a partial prototype.

### 6. Public published pages now resolve correctly

- A publishing mismatch was fixed so newly published custom pages now load through the correct public page configuration path.
- This means publishing a page in admin is now much more likely to behave the way the team expects on the live storefront side.

### 7. Small builder usability issues were cleaned up

- The page creation dialog was improved so key fields are properly linked and easier to use.
- The builder now reads the selected page more reliably when opened from the Pages area.
- These changes reduce confusion and make the editing flow more QA-friendly.

## QA Impact

The QA team should now be able to validate the following with more confidence:

- high-quantity first-time orders are challenged before completion
- repeat customers are not incorrectly blocked
- guest order access stays private to the original buyer session
- superadmin page creation and publishing works from start to finish
- published custom pages actually appear on the storefront
- admin customization routes open consistently instead of falling into blank states

## Suggested QA Focus Areas

### Storefront checks

- Try placing a new visitor order with more than 5 items and confirm email verification is required.
- Try the same flow with a trusted repeat customer and confirm the order can proceed normally.
- Confirm normal lower-quantity orders still work as expected.
- Confirm one guest session cannot open or act on another guest session's order.

### Admin checks

- Confirm `/admin`, `/admin/canvas`, `/admin/canvas/branding`, `/admin/canvas/theme`, and `/admin/canvas/legacy` all load properly.
- As a superadmin, create a draft page and open the builder.
- Add a section, reorder it, remove a section, and publish the page.
- Open the public page and confirm the content appears correctly after publish.

## Validation Outcome

The latest verification round confirmed:

- backend health endpoint returned healthy status
- storefront purchase-flow checks passed
- large-order verification behavior passed
- guest-order session protection passed
- superadmin Pages builder create, edit, reorder, delete, publish, and public-view flow passed

## Practical Release Meaning

From a QA perspective, this release is mainly about trust and reliability:

- large suspicious orders are more controlled
- customer order access is safer
- the new customization workflow is now testable in a realistic way
- published page behavior is closer to what the admin user expects

## Recommended QA Sign-Off Approach

For this round, QA sign-off should focus on:

- checkout protection rules
- guest-order privacy behavior
- superadmin page-builder workflow
- public page publishing accuracy

If those areas pass in your environment, the most important risk areas from this change set are covered.
