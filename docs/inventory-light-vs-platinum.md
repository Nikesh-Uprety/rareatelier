# Inventory Light vs Platinum Comparison

A detailed comparison between the two inventory workspace tiers in RARE Nepal admin panel.

---

## Overview

| Aspect | Light | Platinum |
|--------|-------|----------|
| **Access** | All users (free) | Paid tier (Rs 2000/month) |
| **Target** | Basic stock operations | Advanced inventory management |
| **Theme** | Light mode with subtle gradients | Dark workspace |
| **Access Control** | All users | Admin roles only |

---

## Feature Comparison

### Inventory Light

| Feature | Status |
|---------|--------|
| Stock overview (KPI cards) | ✅ Included |
| Filter by outlet | ✅ Included |
| Filter by status (in stock, low, out) | ✅ Included |
| Inventory table view | ✅ Included |
| Stock-in functionality | ✅ Included |
| Product detail dialog | ✅ Included |
| Movement log preview | ✅ Included |
| Search items | ✅ Included |
| Category chips filter | ✅ Included |
| **Valuation details** | ❌ Not included |
| **Movement history** | ❌ Preview only |
| **Stock health tracking** | ❌ Not included |
| **Reorder point config** | ❌ Not included |
| **Bulk operations** | ❌ Not included |

### Inventory Platinum

| Feature | Status |
|---------|--------|
| All Light features | ✅ Included |
| Detailed valuation | ✅ Included |
| Movement history | ✅ Full with reference |
| Stock health alerts | ✅ With progress bar |
| Reorder point tracking | ✅ Configurable |
| Bulk transfer ops | ✅ Advanced |
| Dark workspace | ✅ Full |
| Cost basis tracking | ✅ Included |
| Gross spread calculation | ✅ Included |

---

## Pros & Cons

### Inventory Light

**Pros:**
- Free for all users
- Clean, simple UI with modern styling
- Quick stock overview
- Essential filtering and search
- Fast loading, minimal chrome
- Sufficient for basic workflows

**Cons:**
- Limited to basic details
- No full movement history
- No valuation metrics
- No reorder point config
- No bulk operations
- No advanced alerts

### Inventory Platinum

**Pros:**
- Full valuation (cost basis, inventory value, gross spread)
- Complete movement history with references
- Stock health with visual progress
- Reorder point automation
- Bulk transfer operations
- Dark theme for dense operations
- Premium page treatment

**Cons:**
- Paid tier (Rs 2000/mo)
- Limited to higher-permission roles
- More complex UI
- Heavier than Light variant

---

## Architecture Notes

### Access Control
- **Light**: Open to all authenticated users
- **Platinum**: Reserved for `superadmin`, `owner`, `admin`, `manager` roles

### Current Implementation
- Both routes accessible: `/admin/inventory/light` and `/admin/inventory/platinum`
- Automatic redirection based on role permissions
- Upgrade gate for non-eligible roles

### Visual Design
- **Light**: White/clean with subtle radial gradients, card shadows
- **Platinum**: Dark mode with indigo accents, glassmorphism elements

---

## Use Cases

### When to Use Light
- Quick stock checks
- Adding inventory via dialog
- Basic filtering by outlet
- Viewing current stock levels
- Team members performing simple inventory tasks

### When to Use Platinum
- Financial reporting (valuation)
- Movement auditing
- Low stock alert management
- Bulk transfers between outlets
- Reorder point planning
- Detailed inventory analysis

---

## UI/UX Patterns Applied

Based on the UI reasoning framework, this comparison follows:

- **Category**: SaaS Dashboard (Data-Dense)
- **Pattern**: Feature-Rich Showcase + Minimalism
- **Style**: Trust & Authority + Clean typography
- **Key Effects**: Hover tooltips, smooth transitions

---

## Future Considerations

1. **Billing Integration**: Wire OTP entitlements to payment system
2. **Per-Page RBAC**: Fine-grained access control within Platinum
3. **Export Features**: CSV/PDF export for both tiers
4. **Real-time Updates**: WebSocket for live inventory changes
5. **Mobile View**: Responsive optimization for light variant

---

*Document generated: April 2026*
*Part of RARE Nepal Admin Panel Documentation*