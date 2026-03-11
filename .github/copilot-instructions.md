# Copilot Instructions for RARE Nepal E-Commerce Platform

## Project Overview

This is a **full-stack e-commerce platform** built with:
- **Frontend**: React 19 + Vite + TailwindCSS + Radix UI
- **Backend**: Express.js + Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Passport.js (local strategy) + bcryptjs + 2FA support
- **Deployment**: Render (via render.yaml)

The application combines a **storefront** (customer-facing) and **admin dashboard** in a single monolithic codebase with shared types.

---

## Build & Development Commands

### Primary Commands
```bash
npm run dev          # Start dev server (backend + frontend with Vite HMR) on PORT (default 5000)
npm run build        # Production build (Vite client + esbuild server) → dist/
npm start            # Run production build from dist/index.cjs
npm run check        # TypeScript compilation check (no emit)
```

### Database
```bash
npm run db:push      # Push Drizzle schema to PostgreSQL
npm run db:seed      # Run seed.ts to populate sample data
```

### Development-Only
```bash
npm run dev:client   # Frontend-only dev (Vite on port 5000, no backend)
```

### Build Artifacts
- **Client**: `dist/public/` (Vite bundle)
- **Server**: `dist/index.cjs` (1.3MB esbuild bundle)
- **Build script**: `script/build.ts` (orchestrates both)

---

## Architecture

### Directory Structure
```
client/
  ├── src/
  │   ├── pages/          # Route pages (storefront + admin)
  │   │   ├── storefront/ # Customer pages (Home, Cart, Orders, etc.)
  │   │   └── admin/      # Admin dashboard (Products, Analytics, Attributes, etc.)
  │   ├── components/     # Reusable React components
  │   │   └── ui/         # Radix UI primitives
  │   ├── hooks/          # Custom React hooks
  │   ├── lib/            # API clients (adminApi.ts, api.ts) + utilities
  │   └── store/          # Zustand state management
  │
server/
  ├── routes.ts          # Express route definitions (1600+ lines)
  ├── storage.ts         # Database abstraction layer (SQLite-like interface)
  ├── auth.ts            # Passport.js configuration + 2FA logic
  ├── errorHandler.ts    # Centralized error handling & response formatting
  ├── logger.ts          # Structured logging
  ├── middleware/        # Express middleware
  │   ├── requireAuth.ts
  │   ├── requireAdmin.ts
  │   ├── security.ts    # CORS, rate-limiting, security headers
  │   └── validateRequest.ts
  ├── email.ts           # Nodemailer configuration
  ├── seed.ts            # Database seeding
  └── services/          # Business logic (e.g., billService.ts)
  │
shared/
  └── schema.ts          # Drizzle table definitions + Zod schemas
```

### API Structure
All API endpoints are defined in `server/routes.ts`:

**Route Patterns:**
- `POST /auth/login` - Passport local auth
- `POST /auth/logout` - Clear session
- `GET /api/products` - Public storefront
- `GET /api/admin/*` - Admin endpoints (requires `requireAdmin` middleware)
- `POST /api/orders` - Order creation

**Error Handling:**
Use `handleApiError(res, err, context)` from `errorHandler.ts` for consistent responses:
```typescript
catch (err: any) {
  return handleApiError(res, err, "PUT /api/admin/categories/:id");
}
```

**Type-Safe Query Params:**
Always use `getQueryParam()` for `req.query` and `req.params` (handles string | string[] | ParsedQs):
```typescript
const id = getQueryParam(req.params.id);
if (!id) return sendError(res, "Invalid ID", undefined, 400);
```

### Database Layer
- **Drizzle ORM** for type-safe queries
- **storage.ts**: Abstraction layer implementing all DB operations
- **Schemas**: Defined in `shared/schema.ts` (tables + Zod schemas)
- **Session Store**: PostgreSQL (connect-pg-simple)
- **Connection**: `server/db.ts` creates pool with SSL support

### Frontend State Management
- **React Query**: Data fetching (@tanstack/react-query)
- **Zustand**: Global state (auth, UI state)
- **URL State**: Some pages manage state via query params (e.g., filtering, pagination)

### Security Patterns
- **CORS**: Configured in `middleware/security.ts` (origin-specific credentials in prod, scoped in dev)
- **Rate Limiting**: In-memory store with 5-minute cleanup for expired entries
- **Security Headers**: STS, CSP, X-Frame-Options, XSS filter, etc.
- **Sessions**: Secure httpOnly cookies, 7-day maxAge
- **2FA**: OTP codes stored + sent via email (see `auth.ts` and `email.ts`)

---

## Key Conventions

### Naming & File Organization
- **API Client Functions**: Prefix with context (e.g., `fetchAdminProducts`, `createAdminProduct`)
- **Admin Pages**: Separate from storefront (e.g., `client/src/pages/admin/Products.tsx`)
- **Utilities**: Placed in `lib/` with clear naming (`format.ts`, `imageUtils.ts`, etc.)
- **Middleware**: One concern per file in `server/middleware/`

### Code Patterns

#### Express Routes
- All routes use try/catch with centralized error handling
- Request body validation with Zod schemas
- Extract params/query with `getQueryParam()` for type safety
```typescript
app.put("/api/admin/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = getQueryParam(req.params.id);
    if (!id) return sendError(res, "Invalid ID", undefined, 400);
    // ... rest of handler
  } catch (err: any) {
    return handleApiError(res, err, "PUT /api/admin/categories/:id");
  }
});
```

#### Database Queries
- Use `storage.*` methods (abstraction layer)
- Drizzle query builder in `storage.ts`: `db.query.products.findMany()`, `db.insert(...)`, etc.
- All schemas from `shared/schema.ts`

#### React Components
- Use Radix UI for base components (in `components/ui/`)
- Form state with react-hook-form + Zod validation
- Data fetching with React Query (see `lib/adminApi.ts` for patterns)
```typescript
const { data: products } = useQuery({
  queryKey: ["admin", "products"],
  queryFn: () => fetchAdminProducts({ /* params */ }),
});
```

#### Client API Calls
- Grouped in `lib/adminApi.ts` (admin) and `lib/api.ts` (storefront)
- Error responses follow `{ success: false, error: string }` format
- Successful responses: `{ success: true, data: T }`

### TypeScript Paths
```json
"@/*": ["./client/src/*"]
"@shared/*": ["./shared/*"]
```
Use `@/` for client imports and `@shared/` for shared types.

### Environment Variables
Required in `.env`:
```
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-string>
NODE_ENV=development|production
PORT=5000
ALLOWED_ORIGINS=http://localhost:5000,https://example.com (prod only)
EMAIL_* = SMTP config for Nodemailer
```

---

## Common Tasks

### Adding a New Admin Page
1. Create component in `client/src/pages/admin/YourPage.tsx`
2. Add route in `client/src/App.tsx` under admin routes
3. Add API endpoints in `server/routes.ts` under `/api/admin/*`
4. Use `requireAdmin` middleware for protection
5. Update `AdminLayout.tsx` navigation if needed

### Adding a New API Endpoint
1. Define schema in `shared/schema.ts` (if needed)
2. Implement in `server/routes.ts` with error handling
3. Add client function in `lib/adminApi.ts` or `lib/api.ts`
4. Use React Query in components for fetching

### Modifying Database Schema
1. Update table definition in `shared/schema.ts`
2. Update Zod insert schema
3. Run `npm run db:push` to apply migration
4. Update `storage.ts` if querying changed fields
5. Update client code using the affected data

### Authentication & Authorization
- **requireAuth**: Check if user is logged in
- **requireAdmin**: Check if user is logged in AND role === "admin"
- Both in `server/middleware/`
- User attached to `req.user` (Express.User type)

---

## Known Limitations & Notes

### Build & Performance
- Client bundle includes a ~2.3MB chunk after minification (consider dynamic imports for further optimization)
- Image optimization enabled via vite-plugin-imagemin

### Database
- PostgreSQL connection requires SSL (sslmode config in connection string)
- Migrations: use `npm run db:push` (Drizzle's built-in push, not migrations)

### 2FA
- OTP codes currently exposed via API for testing (remove in production)
- Email sending requires SMTP config in `.env`

### Testing
- No automated test suite exists; manual testing required
- TypeScript provides type safety (run `npm run check` before commits)

---

## Debugging

### Common Issues

**"Cannot find module '@/...'**
- Check `tsconfig.json` paths and `vite.config.ts` aliases match
- Ensure files exist in `client/src/`

**Database connection fails**
- Verify `DATABASE_URL` is correct in `.env`
- Ensure PostgreSQL is running and accessible
- Check SSL mode (sslmode=require vs verify-full)

**TypeScript errors on build**
- Run `npm run check` to see all errors
- Check `errorHandler.ts` for expected error patterns

**CORS errors**
- Check `middleware/security.ts` for allowed origins
- In dev: any origin allowed if no Origin header; with Origin header: must match
- In prod: must be in `ALLOWED_ORIGINS` env var

---

## Performance & Optimization Tips

- Use React Query's cache invalidation strategically to avoid over-fetching
- Lazy load admin pages with dynamic imports (currently not done, low priority)
- Monitor bundle size; consider code-splitting heavy libraries (jspdf, html2canvas)
- Rate limiting on auth endpoints is active (10 req/min per IP)

---

## Last Updated
March 11, 2026 - Post-verification commit with security fixes and centralized error handling.
