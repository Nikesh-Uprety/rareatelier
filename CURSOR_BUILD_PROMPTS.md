# RARE.np — Cursor Build Prompts
## Section-by-Section Instructions
> Paste ONE section at a time into Cursor chat. Do not paste multiple sections together.
> After each section completes, mark tasks in PROJECT_PROGRESS.md before moving on.

---

# ════════════════════════════════════════════
# CURSOR SESSION OPENER — PASTE THIS FIRST IN EVERY NEW SESSION
# ════════════════════════════════════════════

```
Before writing any code, read these two files in full:
1. SKILLS.md
2. PROJECT_PROGRESS.md

Identify which tasks are marked [ ] (not started) or [~] (in progress).
Start from the first incomplete task in the current phase.
After completing each task, mark it [x] in PROJECT_PROGRESS.md.
If you run out of context mid-task, mark it [~] and add a session note at the bottom of PROJECT_PROGRESS.md describing exactly where you stopped and what the next step is.
```

---

# ════════════════════════════════════════════
# SECTION 1 — Database Client & Schema
# Paste into Cursor when starting Phase 1.1
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md first.

Task: Set up the Drizzle + PostgreSQL database layer.

STEP 1 — Create server/db.ts
Create this file with the following logic:
- Import pg from 'pg' and { drizzle } from 'drizzle-orm/node-postgres'
- Import all table schemas from '../shared/schema'
- Create a pg Pool using process.env.DATABASE_URL (throw a clear error if missing)
- Wrap the pool with drizzle() and export as `db`
- Export the pool separately as `pool` (needed for session store)

STEP 2 — Extend shared/schema.ts
Add or confirm these tables exist with correct Drizzle column definitions:

users:
  id (text, primaryKey, defaultRandom cuid)
  email (text, unique, notNull)
  password (text, notNull) — will store bcrypt hash
  name (text, notNull)
  role (text, default 'customer') — values: 'admin' | 'staff' | 'customer'
  createdAt (timestamp, defaultNow)

products:
  id (text, primaryKey)
  name (text, notNull)
  slug (text, unique, notNull)
  sku (text, unique, notNull)
  description (text)
  price (numeric, notNull)
  comparePrice (numeric)
  stock (integer, default 0)
  category (text, notNull) — 'TOPS' | 'BOTTOMS' | 'ACCESSORIES' | 'FOOTWEAR'
  images (json, default [])
  variants (json, default [])
  isActive (boolean, default true)
  createdAt (timestamp, defaultNow)

orders:
  id (text, primaryKey)
  orderNumber (text, unique, notNull)
  customerId (text, FK → customers.id)
  status (text, default 'pending') — 'pending'|'processing'|'completed'|'cancelled'
  subtotal (numeric, notNull)
  tax (numeric, notNull)
  discount (numeric, default 0)
  total (numeric, notNull)
  paymentMethod (text, default 'card')
  shippingAddr (json)
  createdAt (timestamp, defaultNow)

order_items:
  id (text, primaryKey)
  orderId (text, FK → orders.id, onDelete: cascade)
  productId (text, FK → products.id)
  variantId (text)
  quantity (integer, notNull)
  priceAtTime (numeric, notNull)

customers:
  id (text, primaryKey)
  userId (text, FK → users.id, nullable) — link if customer has an account
  firstName (text, notNull)
  lastName (text, notNull)
  email (text, unique, notNull)
  phone (text)
  avatarColor (text, default '#2D4A35')
  totalSpent (numeric, default 0)
  orderCount (integer, default 0)
  createdAt (timestamp, defaultNow)
  lastOrderDate (timestamp)

Export all InferSelectModel types as: User, Product, Order, OrderItem, Customer

STEP 3 — Verify drizzle.config.ts
Ensure it points to shared/schema.ts and DATABASE_URL env var. Do not change the output dialect.

STEP 4 — Mark tasks [x] in PROJECT_PROGRESS.md for:
- Create server/db.ts
- Extend shared/schema.ts

Do NOT run db:push yet — user will run that manually after setting DATABASE_URL.
```

---

# ════════════════════════════════════════════
# SECTION 2 — Seed File
# Paste into Cursor after Section 1 is complete
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Create server/seed.ts — seed the database with realistic mock data.

The seed file should:
1. Import db from './db'
2. Import bcryptjs and hash passwords before inserting
3. Clear tables in this order before seeding (to avoid FK conflicts):
   order_items → orders → customers → products → users
4. Insert the following:

USERS (2):
  { email: 'admin@rare.np', password: hash('admin123'), name: 'Admin User', role: 'admin' }
  { email: 'staff@rare.np', password: hash('staff123'), name: 'Staff Member', role: 'staff' }

PRODUCTS (9) — use these exact values:
  { name:'Linen Overshirt', sku:'SKU-1024', price:120, stock:12, category:'TOPS', variants:['Charcoal','Sand'] }
  { name:'Slub Cotton Tee', sku:'SKU-0882', price:68, stock:34, category:'TOPS', variants:['Cream','Black','Olive'] }
  { name:'Deconstructed Blazer', sku:'SKU-1156', price:380, stock:3, category:'TOPS', variants:['Navy','Ecru'] }
  { name:'Ribbed Modal Longsleeve', sku:'SKU-0991', price:95, stock:18, category:'TOPS', variants:['White','Onyx'] }
  { name:'Wide Leg Trousers', sku:'SKU-0774', price:195, stock:8, category:'BOTTOMS', variants:['Ecru','Slate'] }
  { name:'Tailored Shorts', sku:'SKU-0653', price:115, stock:22, category:'BOTTOMS', variants:['Khaki','Black'] }
  { name:'Merino Turtleneck', sku:'SKU-1089', price:155, stock:0, category:'TOPS', variants:['Ivory','Mocha'] }
  { name:'Canvas Tote', sku:'SKU-0442', price:85, stock:45, category:'ACCESSORIES', variants:['Natural','Black'] }
  { name:'Leather Card Holder', sku:'SKU-0318', price:45, stock:30, category:'ACCESSORIES', variants:['Tan','Onyx'] }
  Generate slug from name (lowercase, replace spaces with hyphens).
  Generate cuid() ids.

CUSTOMERS (7):
  { firstName:'Mia', lastName:'Laurent', email:'mia.laurent@email.com', totalSpent:2140, orderCount:6, avatarColor:'#2D4A35' }
  { firstName:'James', lastName:'Okafor', email:'james.o@email.com', totalSpent:1220, orderCount:4, avatarColor:'#2D3A5A' }
  { firstName:'Sofia', lastName:'Reyes', email:'s.reyes@email.com', totalSpent:840, orderCount:3, avatarColor:'#7A2D35' }
  { firstName:'Luca', lastName:'Marchetti', email:'luca.m@email.com', totalSpent:3890, orderCount:11, avatarColor:'#5A4A2D' }
  { firstName:'Amara', lastName:'Diallo', email:'amara.d@email.com', totalSpent:68, orderCount:1, avatarColor:'#2D5A55' }
  { firstName:'Noah', lastName:'Chen', email:'noah.c@email.com', totalSpent:1540, orderCount:5, avatarColor:'#3A3A3A' }
  { firstName:'Isla', lastName:'Kim', email:'isla.k@email.com', totalSpent:920, orderCount:3, avatarColor:'#4A2D5A' }

ORDERS (6) — link to customers above:
  { orderNumber:'UX-2025-0042', customer: Mia Laurent, status:'completed', subtotal:450, tax:35, total:485, items:3 }
  { orderNumber:'UX-2025-0041', customer: James Okafor, status:'pending', subtotal:110, tax:10, total:120, items:1 }
  { orderNumber:'UX-2025-0040', customer: Sofia Reyes, status:'completed', subtotal:250, tax:25, total:275, items:2 }
  { orderNumber:'UX-2025-0039', customer: Luca Marchetti, status:'completed', subtotal:560, tax:50, total:610, items:4 }
  { orderNumber:'UX-2025-0038', customer: Amara Diallo, status:'cancelled', subtotal:62, tax:6, total:68, items:1 }
  { orderNumber:'UX-2025-0037', customer: Noah Chen, status:'completed', subtotal:285, tax:30, total:315, items:2 }

Add "db:seed" to package.json scripts: "tsx server/seed.ts"

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 3 — Storage Layer (IStorage + PgStorage)
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Build the storage abstraction layer in server/storage.ts

STEP 1 — Define IStorage interface with these methods:
  // Products
  getProducts(filters?: { category?: string; search?: string; page?: number; limit?: number }): Promise<Product[]>
  getProductById(id: string): Promise<Product | null>
  createProduct(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product>
  updateProduct(id: string, data: Partial<Product>): Promise<Product>
  deleteProduct(id: string): Promise<void>

  // Orders
  getOrders(filters?: { status?: string; search?: string; page?: number }): Promise<Order[]>
  getOrderById(id: string): Promise<Order & { items: OrderItem[] }>
  createOrder(data: CreateOrderInput): Promise<Order>
  updateOrderStatus(id: string, status: string): Promise<Order>

  // Customers
  getCustomers(search?: string): Promise<Customer[]>
  getCustomerById(id: string): Promise<Customer & { orders: Order[] }>
  createCustomer(data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer>
  upsertCustomerFromOrder(email: string, firstName: string, lastName: string): Promise<Customer>

  // Users
  getUserByEmail(email: string): Promise<User | null>
  createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User>

  // Analytics
  getAnalytics(range: '7d' | '30d' | '90d' | '1y'): Promise<AnalyticsData>

STEP 2 — Implement PgStorage class using Drizzle:
  - Import db from './db'
  - Implement all IStorage methods using Drizzle queries
  - Use `db.select({ ... }).from(table).where(...)` — always use select{} to specify fields
  - getAnalytics() should compute: totalRevenue, totalOrders, avgOrderValue, newCustomers, 
    revenueByDay (array of {date, revenue}), salesByCategory (array of {category, value, percent})

STEP 3 — Export:
  export const storage: IStorage = new PgStorage()

STEP 4 — Keep MemStorage as a fallback class (don't delete it) but don't export it as default.

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 4 — Auth Routes & Passport Setup
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Set up Passport.js authentication with Postgres-backed sessions.

STEP 1 — Install required packages (if not already installed):
  express-session connect-pg-simple passport passport-local bcryptjs
  @types/passport @types/passport-local @types/express-session @types/bcryptjs @types/connect-pg-simple

STEP 2 — Create server/auth.ts:
  - Configure passport LocalStrategy:
    - Find user by email using storage.getUserByEmail()
    - Compare password with bcrypt.compare()
    - Return user or false
  - Implement passport.serializeUser: stores user.id in session
  - Implement passport.deserializeUser: fetches user by id from DB
  - Export configurePassport() function

STEP 3 — Update server/index.ts:
  - Import pool from './db'
  - Configure express-session BEFORE passport:
    store: new connectPgSimple({ pool, createTableIfMissing: true })
    secret: process.env.SESSION_SECRET (throw if missing)
    resave: false
    saveUninitialized: false
    cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 7 days }
  - Add passport.initialize() and passport.session()
  - Call configurePassport()

STEP 4 — Create auth route handlers in server/routes.ts (or server/routes/auth.ts):

POST /api/auth/register:
  - Validate body: { name, email, password } with Zod (password min 6 chars)
  - Check if email already exists → return 400 if so
  - Hash password with bcrypt.hash(password, 10)
  - Create user with role 'customer'
  - Log user in with req.login()
  - Return { success: true, data: { id, email, name, role } }

POST /api/auth/login:
  - Validate body: { email, password } with Zod
  - Use passport.authenticate('local') as middleware
  - On success: return { success: true, data: { id, email, name, role } }
  - On failure: return { success: false, error: 'Invalid email or password' }

POST /api/auth/logout:
  - Call req.logout()
  - Return { success: true }

GET /api/auth/me:
  - If req.isAuthenticated(): return { success: true, data: req.user }
  - Else: return 401 { success: false, error: 'Not authenticated' }

STEP 5 — Create server/middleware/requireAuth.ts and requireAdmin.ts as described in SKILLS.md

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 5 — Product & Order API Routes
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Implement all product and order API routes in server/routes.ts

All routes must:
- Return { success: true, data: ... } on success
- Return { success: false, error: string } on failure
- Use storage.* methods — never query db directly in routes
- Validate request bodies with Zod

STOREFRONT ROUTES (public — no auth required):

GET /api/products
  - Accept query: ?category=&search=&page=&limit=
  - Call storage.getProducts(filters)
  - Return array of products

GET /api/products/:id
  - Call storage.getProductById(id)
  - Return 404 if not found

POST /api/orders
  - Zod schema: { 
      items: [{ productId, variantId?, quantity, priceAtTime }], 
      shipping: { firstName, lastName, email, phone?, address, city, state, zip, country },
      paymentMethod: string
    }
  - Generate orderNumber: 'UX-' + year + '-' + padded 4-digit sequence
  - Calculate subtotal from items
  - Calculate tax at 15%
  - Upsert customer from shipping email/name
  - Call storage.createOrder(...)
  - Return order with items

ADMIN ROUTES (apply requireAdmin middleware to all):

GET /api/admin/products — same as public but includes inactive products
POST /api/admin/products — validate with productSchema Zod, call storage.createProduct()
PUT /api/admin/products/:id — validate partial productSchema, call storage.updateProduct()
DELETE /api/admin/products/:id — call storage.deleteProduct()

GET /api/admin/orders — ?status=&search=&page=
PUT /api/admin/orders/:id — body: { status }, validate status is valid enum value
GET /api/admin/orders/export
  - Fetch all orders with customer names
  - Build CSV string with headers: Order,Customer,Email,Date,Items,Status,Amount
  - Return as response with Content-Type: text/csv, Content-Disposition: attachment; filename=orders.csv

GET /api/admin/customers — ?search=
GET /api/admin/customers/:id — returns customer + last 10 orders
GET /api/admin/analytics — ?range=7d|30d|90d|1y — calls storage.getAnalytics()

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 6 — Frontend Auth (Login Page + ProtectedRoute)
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Implement frontend authentication — Login page, ProtectedRoute, and auth state in Navbar.

STEP 1 — Create client/src/pages/auth/Login.tsx

Design spec:
- Full-screen centered layout, bg: var(--bg-primary)
- Card: 420px wide, bg: var(--bg-card), border: 1px solid var(--border), border-radius 20px, padding 40px
- Top: "RARE.np" brand text (DM Sans, uppercase, letter-spacing, small, muted) + "URBAN THREADS" subtitle
- Heading: "Welcome back" (Playfair Display, 28px)
- Subheading: "Sign in to your account" (muted, 14px)
- Form fields:
  - Email input (react-hook-form, Zod: z.string().email())
  - Password input with show/hide toggle (Eye icon from lucide-react)
- Error message: inline below failing field in red
- Submit button: "Sign in" — full width, bg var(--accent), white text, 44px height
- Dev helper: small collapsed section showing seed credentials (admin@rare.np / admin123)
- After login: redirect to /admin if role is admin/staff, else /

STEP 2 — Add currentUser query hook in client/src/hooks/useCurrentUser.ts:
  - useQuery({ queryKey: ['currentUser'], queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : null) })
  - Return { user, isLoading, isAuthenticated }

STEP 3 — Create ProtectedRoute component in client/src/components/ProtectedRoute.tsx:
  - Takes: children, requireAdmin?: boolean
  - If isLoading: show full-screen skeleton
  - If not authenticated: redirect to /login
  - If requireAdmin and user.role !== 'admin' and user.role !== 'staff': redirect to /
  - Otherwise: render children

STEP 4 — Update App.tsx router:
  - Add /login route → Login page (redirect to /admin if already logged in)
  - Wrap all /admin/* routes with <ProtectedRoute requireAdmin>
  - Wrap /orders/:id and /checkout with <ProtectedRoute> (auth required but not admin)

STEP 5 — Update Navbar.tsx:
  - Import useCurrentUser hook
  - If authenticated: show user name + avatar (initials circle) + Logout button
  - Logout button calls POST /api/auth/logout then queryClient.invalidateQueries(['currentUser'])
  - If not authenticated: show "Sign in" link → /login

STEP 6 — Update AdminLayout.tsx sidebar:
  - Show logged-in user name + role below the user avatar circle at sidebar bottom

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 7 — Replace Mock Data in Storefront
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Connect storefront pages to real API data using React Query.

STEP 1 — Create API utility functions in client/src/lib/api.ts:
  async function fetchProducts(filters?: { category?: string; search?: string; page?: number }) — GET /api/products
  async function fetchProductById(id: string) — GET /api/products/:id
  async function createOrder(data: OrderInput) — POST /api/orders

STEP 2 — Update client/src/pages/storefront/Products.tsx:
  - Remove MOCK_PRODUCTS import
  - Add useQuery({ queryKey: ['products', filters], queryFn: () => fetchProducts(filters) })
  - Keep existing search, filter, sort UI — but filter against query result data, not mock data
  - Show ProductCardSkeleton (3x4 grid of skeletons) while isLoading
  - Show error state with "Failed to load products. Try again." + retry button if isError

STEP 3 — Update client/src/pages/storefront/ProductDetail.tsx:
  - Remove MOCK_PRODUCTS import
  - Use useParams() to get product id
  - Add useQuery({ queryKey: ['products', id], queryFn: () => fetchProductById(id) })
  - Show skeleton while loading
  - Show 404-style message if product not found

STEP 4 — Update client/src/pages/storefront/Checkout.tsx:
  - On form submit: call createOrder() with cart items from Zustand store + form values
  - On success: clear cart, navigate to /checkout/success?orderId=xxx
  - On error: show inline error message

STEP 5 — Update client/src/pages/storefront/OrderSuccess.tsx:
  - Read orderId from URL query param
  - Fetch order from GET /api/orders/:id using react-query
  - Display real order data: order number, items, totals

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 8 — Replace Mock Data in Admin Panel
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Connect all admin panel pages to real API data.

STEP 1 — Create admin API utility functions in client/src/lib/adminApi.ts:
  All functions require admin role (server enforces, but prefix all with /api/admin):
  fetchAdminProducts(filters?)
  createProduct(data) — POST
  updateProduct(id, data) — PUT
  deleteProduct(id) — DELETE
  fetchAdminOrders(filters?)
  updateOrderStatus(id, status) — PUT
  exportOrdersCSV() — GET, triggers download
  fetchAdminCustomers(search?)
  fetchCustomerById(id)
  fetchAnalytics(range)

STEP 2 — Update admin/Products.tsx:
  - Replace MOCK_PRODUCTS with useQuery(['admin', 'products', filters])
  - Create product: useMutation → POST, then invalidate ['admin', 'products']
  - Update product: useMutation → PUT, then invalidate
  - Delete product: useMutation → DELETE, then invalidate
  - Show success toast after each mutation
  - Optimistic update: add/remove product from cache immediately

STEP 3 — Update admin/Orders.tsx:
  - Replace mock with useQuery(['admin', 'orders', filters])
  - Status update: useMutation → PUT /api/admin/orders/:id, invalidate orders
  - Export CSV button: calls exportOrdersCSV() which triggers browser file download
    (use: window.location.href = '/api/admin/orders/export')

STEP 4 — Update admin/Customers.tsx:
  - Replace mock with useQuery(['admin', 'customers', search])
  - On customer select: useQuery(['admin', 'customers', id]) for detail panel
  - Show customer orders in detail panel

STEP 5 — Update admin/Analytics.tsx:
  - Replace static values with useQuery(['admin', 'analytics', range])
  - Date range selector changes `range` state → triggers new query
  - All 4 KPI cards, revenue chart, category pie, top products, payment methods — all live data
  - Show skeleton KPI cards while loading

STEP 6 — Update admin/POS.tsx:
  - Product search: debounced useQuery hitting GET /api/products?search=
  - Checkout creates real order via createOrder() from client/src/lib/api.ts

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 9 — Content Pages & UX Polish
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Create static content pages, fix all empty states, and add toast notifications.

STEP 1 — Create static pages in client/src/pages/storefront/:
  Create simple, well-styled pages for:
  - Shipping.tsx — /shipping — Shipping policy (write sensible placeholder content)
  - Refund.tsx — /refund — Refund policy
  - Privacy.tsx — /privacy — Privacy policy
  - Terms.tsx — /terms — Terms of service
  - Contact.tsx — /contact — Contact form (static, no backend needed yet)
  
  Each page: consistent layout with heading, subheading, content sections
  Add all routes to App.tsx
  Update Footer.tsx links to point to these routes (not # placeholders)

STEP 2 — Add empty states (use existing EmptyState component or create one):
  - Products page: "No products found" with clear filters button
  - Cart page: "Your bag is empty" with "Continue Shopping" button → /products
  - Admin Orders: "No orders yet" 
  - Admin Customers: "No customers yet"
  - Admin POS bag empty: shopping bag icon + "Bag is empty" text (already in design)

STEP 3 — Add toast notifications (use shadcn/ui Sonner or toast):
  - "Added to cart" after addItem()
  - "Product created" after admin create
  - "Order status updated" after admin status change
  - "Checkout successful" after order creation
  - "Copied to clipboard" for order number copy

STEP 4 — Verify all 3 themes (light/dark/warm) look correct on:
  - Navbar
  - Storefront product grid
  - Admin sidebar
  - KPI cards
  - Charts (chart backgrounds + text should use CSS vars)
  - Modals/sheets
  - Table rows
  Fix any components that are hardcoded to light-mode colors

STEP 5 — Mobile responsiveness check:
  - Navbar: hamburger menu on mobile < 768px
  - Admin sidebar: collapses, show bottom nav bar on mobile
  - Product grid: 1 column on mobile
  - Cart: stacked layout on mobile
  - Checkout: single column form on mobile

Mark tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# SECTION 10 — Final Operations & Deployment Prep
# ════════════════════════════════════════════

```
Read SKILLS.md and PROJECT_PROGRESS.md. Continue from last completed task.

Task: Final cleanup, environment documentation, and deployment readiness.

STEP 1 — Create .env.example in root:
  DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
  SESSION_SECRET=replace-with-random-32-char-string
  NODE_ENV=development
  PORT=5000
  # Optional - Phase 5
  # STRIPE_SECRET_KEY=sk_test_...
  # STRIPE_WEBHOOK_SECRET=whsec_...

STEP 2 — Add health check endpoint to server/routes.ts:
  GET /api/health
  - Try a simple db query (SELECT 1)
  - Return { status: 'ok', db: 'connected', timestamp: ISO string } on success
  - Return { status: 'error', db: 'disconnected' } on db failure

STEP 3 — Update README.md with:
  ## Quick Start
  1. Clone repo
  2. npm install
  3. Copy .env.example → .env and fill in DATABASE_URL + SESSION_SECRET
  4. npm run db:push (creates tables)
  5. npm run db:seed (seeds sample data)
  6. npm run dev

  ## Tech Stack section (brief)
  ## Deployment section:
    - Recommended: Railway or Render (free tier, Postgres included)
    - Set environment variables in dashboard
    - Build command: npm run build
    - Start command: npm start

STEP 4 — Verify npm run build produces no TypeScript errors:
  - Fix any type errors in server/ or client/
  - Ensure server/static.ts correctly serves the Vite build output

STEP 5 — Final PROJECT_PROGRESS.md update:
  - Mark all completed tasks [x]
  - Leave clear notes on any remaining [ ] items

Mark all Phase 7 tasks [x] in PROJECT_PROGRESS.md.
```

---

# ════════════════════════════════════════════
# EMERGENCY RESUME PROMPT
# Use this if Cursor loses context mid-session
# ════════════════════════════════════════════

```
This is the RARE.np project. Read these files immediately before doing anything:
1. SKILLS.md — full architecture reference, tech stack, coding rules
2. PROJECT_PROGRESS.md — current task status and session notes

Then:
1. Find the most recent [~] (in progress) task or the first [ ] (not started) task
2. Read the session notes at the bottom of PROJECT_PROGRESS.md
3. Continue from exactly where the previous session stopped
4. Do not re-do completed [x] tasks
5. After completing each task, mark it [x] in PROJECT_PROGRESS.md
```
