# UI Fixes Walkthrough

## Changes Made

### 1. Page Navigation Animation Removed

```diff:App.tsx
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

import Navbar from "@/components/layout/Navbar";
import AdminLayout from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { lazy, Suspense, useEffect } from "react";
import Home from "@/pages/storefront/Home";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

// Lazy load non-critical components
const Products = lazy(() => import("@/pages/storefront/Products"));
const ProductDetail = lazy(() => import("@/pages/storefront/ProductDetail"));
const NewCollection = lazy(() => import("@/pages/storefront/NewCollection"));
const Contact = lazy(() => import("@/pages/storefront/Contact"));
const Cart = lazy(() => import("@/pages/storefront/Cart"));
const Checkout = lazy(() => import("@/pages/storefront/Checkout"));
const PaymentProcess = lazy(() => import("@/pages/storefront/PaymentProcess"));
const OrderSuccess = lazy(() => import("@/pages/storefront/OrderSuccess"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminBills = lazy(() => import("@/pages/admin/Bills"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminPOS = lazy(() => import("@/pages/admin/POS"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminPromoCodes = lazy(() => import("@/pages/admin/PromoCodes"));
const AdminProfilePage = lazy(() => import("@/pages/admin/Profile"));
const AdminNotifications = lazy(() => import("@/pages/admin/Notifications"));

const LoginPage = lazy(() => import("@/pages/auth/Login"));
const NotFound = lazy(() => import("@/pages/not-found"));

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="py-12 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          &copy; 2025 Rare Atelier. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function LoginRoute() {
  const { user, isLoading } = useCurrentUser();

  // Finish the pre-loader when authentication check is complete
  useEffect(() => {
    if (!isLoading) {
      if (typeof window !== 'undefined' && (window as any).finishLoading) {
        (window as any).finishLoading();
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return <BrandedLoader fullScreen />;
  }

  if (user && (user.role === "admin" || user.role === "staff")) {
    return <Redirect to="/admin" />;
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/profile">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminProfilePage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/promo-codes">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminPromoCodes />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/products">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminProducts />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminOrders />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/customers">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminCustomers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/bills">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminBills />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/pos">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminPOS />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/notifications">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminNotifications />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Storefront Routes */}
      <Route path="/">
        <StorefrontLayout>
          <Home />
        </StorefrontLayout>
      </Route>
      <Route path="/products">
        <StorefrontLayout>
          <Products />
        </StorefrontLayout>
      </Route>
      <Route path="/product/:id">
        <StorefrontLayout>
          <ProductDetail />
        </StorefrontLayout>
      </Route>
      <Route path="/new-collection">
        <StorefrontLayout>
          <NewCollection />
        </StorefrontLayout>
      </Route>
      <Route path="/contact">
        <StorefrontLayout>
          <Contact />
        </StorefrontLayout>
      </Route>
      <Route path="/cart">
        <StorefrontLayout>
          <Cart />
        </StorefrontLayout>
      </Route>
      <Route path="/checkout">
        <StorefrontLayout>
          <Checkout />
        </StorefrontLayout>
      </Route>
      <Route path="/checkout/payment">
        <StorefrontLayout>
          <PaymentProcess />
        </StorefrontLayout>
      </Route>
      <Route path="/checkout/success/:id">
        <StorefrontLayout>
          <OrderSuccess />
        </StorefrontLayout>
      </Route>
      <Route path="/admin/login">
        <LoginRoute />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<BrandedLoader fullScreen />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
===
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

import Navbar from "@/components/layout/Navbar";
import AdminLayout from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCurrentUser } from "@/hooks/useCurrentUser";

import { lazy, Suspense, useEffect } from "react";
import Home from "@/pages/storefront/Home";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

// Lazy load non-critical components
const Products = lazy(() => import("@/pages/storefront/Products"));
const ProductDetail = lazy(() => import("@/pages/storefront/ProductDetail"));
const NewCollection = lazy(() => import("@/pages/storefront/NewCollection"));
const Contact = lazy(() => import("@/pages/storefront/Contact"));
const Cart = lazy(() => import("@/pages/storefront/Cart"));
const Checkout = lazy(() => import("@/pages/storefront/Checkout"));
const PaymentProcess = lazy(() => import("@/pages/storefront/PaymentProcess"));
const OrderSuccess = lazy(() => import("@/pages/storefront/OrderSuccess"));

const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("@/pages/admin/Products"));
const AdminOrders = lazy(() => import("@/pages/admin/Orders"));
const AdminBills = lazy(() => import("@/pages/admin/Bills"));
const AdminCustomers = lazy(() => import("@/pages/admin/Customers"));
const AdminPOS = lazy(() => import("@/pages/admin/POS"));
const AdminAnalytics = lazy(() => import("@/pages/admin/Analytics"));
const AdminPromoCodes = lazy(() => import("@/pages/admin/PromoCodes"));
const AdminProfilePage = lazy(() => import("@/pages/admin/Profile"));
const AdminNotifications = lazy(() => import("@/pages/admin/Notifications"));

const LoginPage = lazy(() => import("@/pages/auth/Login"));
const NotFound = lazy(() => import("@/pages/not-found"));

function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="py-12 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          &copy; 2025 Rare Atelier. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function LoginRoute() {
  const { user, isLoading } = useCurrentUser();

  // Finish the pre-loader when authentication check is complete
  useEffect(() => {
    if (!isLoading) {
      if (typeof window !== 'undefined' && (window as any).finishLoading) {
        (window as any).finishLoading();
      }
    }
  }, [isLoading]);

  if (isLoading) {
    return <BrandedLoader fullScreen />;
  }

  if (user && (user.role === "admin" || user.role === "staff")) {
    return <Redirect to="/admin" />;
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminDashboard />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/profile">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminProfilePage />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminAnalytics />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/promo-codes">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminPromoCodes />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/products">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminProducts />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/orders">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminOrders />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/customers">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminCustomers />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/bills">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminBills />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/pos">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminPOS />
          </AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/notifications">
        <ProtectedRoute requireAdmin>
          <AdminLayout>
            <AdminNotifications />
          </AdminLayout>
        </ProtectedRoute>
      </Route>

      {/* Storefront Routes */}
      <Route path="/">
        <StorefrontLayout>
          <Home />
        </StorefrontLayout>
      </Route>
      <Route path="/products">
        <StorefrontLayout>
          <Products />
        </StorefrontLayout>
      </Route>
      <Route path="/product/:id">
        <StorefrontLayout>
          <ProductDetail />
        </StorefrontLayout>
      </Route>
      <Route path="/new-collection">
        <StorefrontLayout>
          <NewCollection />
        </StorefrontLayout>
      </Route>
      <Route path="/contact">
        <StorefrontLayout>
          <Contact />
        </StorefrontLayout>
      </Route>
      <Route path="/cart">
        <StorefrontLayout>
          <Cart />
        </StorefrontLayout>
      </Route>
      <Route path="/checkout">
        <StorefrontLayout>
          <Checkout />
        </StorefrontLayout>
      </Route>
      <Route path="/checkout/payment">
        <StorefrontLayout>
          <PaymentProcess />
        </StorefrontLayout>
      </Route>
      <Route path="/checkout/success/:id">
        <StorefrontLayout>
          <OrderSuccess />
        </StorefrontLayout>
      </Route>
      <Route path="/admin/login">
        <LoginRoute />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Suspense fallback={<div className="fixed inset-0 z-50 bg-background" />}>
            <Router />
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
```

Replaced `<BrandedLoader fullScreen />` Suspense fallback with a minimal `<div>` — pages now transition instantly without the "Curating" animation.

![Shop page loads instantly without animation](/home/nikesh/.gemini/antigravity/brain/8d72eefb-9238-40f2-be0c-ce098ecd47bf/shop_no_animation.png)

---

### 2. Admin Icon Logic Fixed

```diff:Navbar.tsx
import { Link, useLocation } from "wouter";
import { ShoppingBag, Sun, Moon, Coffee, LayoutDashboard, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme";
import { useCartStore } from "@/store/cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const { theme, setTheme } = useThemeStore();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemsCount = useCartStore((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const { user, isAuthenticated } = useCurrentUser();
  const queryClient = useQueryClient();

  const isStorefront = !location.startsWith("/admin");

  const { mutate: logout } = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  // Close menu on location change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isMobileMenuOpen]);

  if (!isStorefront) return null;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || (user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-background border-none">
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-12">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            {/* Apple-style Animated Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative z-[80] flex h-10 w-10 flex-col items-center justify-center gap-[6px] focus:outline-none"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={isMobileMenuOpen ? { rotate: 45, y: 8.5 } : { rotate: 0, y: 0 }}
                className="h-[2px] w-6 bg-current transition-colors"
                style={{ originX: "50%", originY: "50%" }}
              />
              <motion.span
                animate={isMobileMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                className="h-[2px] w-6 bg-current transition-colors"
              />
              <motion.span
                animate={isMobileMenuOpen ? { rotate: -45, y: -8.5 } : { rotate: 0, y: 0 }}
                className="h-[2px] w-6 bg-current transition-colors"
                style={{ originX: "50%", originY: "50%" }}
              />
            </button>
            <Link href="/" className="transition-opacity hover:opacity-80">
              <img src="/images/logo.webp" alt="Logo" className="h-10 md:h-12 w-auto object-contain dark:brightness-0 dark:invert" />
            </Link>
          </div>

          <nav className="hidden md:flex items-center bg-gray-50 dark:bg-muted/50 rounded-full px-2 py-1 space-x-1">
            {[
              { name: "Home", href: "/" },
              { name: "Shop", href: "/products" },
              { name: "New Collection", href: "/new-collection" },
              { name: "Contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                  location === item.href
                    ? "bg-white dark:bg-background shadow-sm"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <SearchBar />

            <button 
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            >
              {theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>



            {!isAuthenticated && (
              <button
                type="button"
                title="Admin Login"
                onClick={() => setLocation("/admin/login")}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
            )}

            {cartItemsCount > 0 && (
              <Link
                href="/cart"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold">
                  {cartItemsCount}
                </span>
              </Link>
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full object-cover border-2 border-black/10 dark:border-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-semibold">
                    {initials}
                  </div>
                )}
                {user.role !== "admin" && user.role !== "staff" && (
                  <button
                    onClick={() => logout()}
                    className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                  >
                    Logout
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-neutral-950 z-[70] shadow-2xl p-8 pt-24 flex flex-col"
            >
              <nav className="flex flex-col space-y-2 mb-12">
                {[
                  { name: "Home", href: "/" },
                  { name: "Shop", href: "/products" },
                  { name: "New Collection", href: "/new-collection" },
                  { name: "Contact", href: "/contact" },
                ].map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (i * 0.05) }}
                  >
                    <Link
                      href={item.href}
                      className={`block px-6 py-4 rounded-full text-lg font-bold tracking-tight transition-all ${
                        location === item.href
                          ? "bg-black text-white dark:bg-white dark:text-black scale-[1.02] shadow-lg"
                          : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-primary"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-auto space-y-6 border-t pt-8 border-gray-100 dark:border-neutral-900">
                {!isAuthenticated ? null : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col space-y-4"
                  >
                    <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user?.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt={user?.name || user?.email}
                              className="w-12 h-12 rounded-full object-cover border-2 border-black/10 dark:border-white/10 shadow-inner"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-sm font-bold shadow-inner">
                              {initials}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-black truncate max-w-[140px] tracking-tight">
                              {user?.name || user?.email}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                              {user?.role}
                            </span>
                          </div>
                        </div>
                        {(user?.role === "admin" || user?.role === "staff") && (
                          <button
                            onClick={() => setLocation("/admin")}
                            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-gray-100 dark:border-neutral-700 hover:scale-105 active:scale-95 transition-transform"
                            title="Admin Dashboard"
                          >
                            <LayoutDashboard className="w-5 h-5 text-emerald-500" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => logout()}
                        className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase font-black tracking-[0.2em] transition-all shadow-lg shadow-red-500/20 active:scale-95"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <div className="flex justify-between items-center px-4">
                  <div className="flex flex-col">
                    <p className="text-[9px] uppercase tracking-[0.4em] font-black text-gray-400 mb-1">
                      Elite Craftsmanship
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.4em] font-black text-gray-300">
                      Rare Atelier &copy; 2025
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isAuthenticated && (
                      <button 
                        onClick={() => setLocation("/admin/login")}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-neutral-900 hover:scale-105 transition-transform"
                        title="Admin Login"
                      >
                        <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                    <button 
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-neutral-900 hover:scale-105 transition-transform"
                    >
                      {theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
===
import { Link, useLocation } from "wouter";
import { ShoppingBag, Sun, Moon, Coffee, LayoutDashboard, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme";
import { useCartStore } from "@/store/cart";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const { theme, setTheme } = useThemeStore();
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemsCount = useCartStore((state) =>
    state.items.reduce((acc, item) => acc + item.quantity, 0),
  );
  const { user, isAuthenticated } = useCurrentUser();
  const queryClient = useQueryClient();

  const isStorefront = !location.startsWith("/admin");

  const { mutate: logout } = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  // Close menu on location change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isMobileMenuOpen]);

  if (!isStorefront) return null;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || (user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-background border-none">
      <div className="max-w-screen-2xl mx-auto px-6 sm:px-12">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-4">
            {/* Apple-style Animated Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden relative z-[80] flex h-10 w-10 flex-col items-center justify-center gap-[6px] focus:outline-none"
              aria-label="Toggle menu"
            >
              <motion.span
                animate={isMobileMenuOpen ? { rotate: 45, y: 8.5 } : { rotate: 0, y: 0 }}
                className="h-[2px] w-6 bg-current transition-colors"
                style={{ originX: "50%", originY: "50%" }}
              />
              <motion.span
                animate={isMobileMenuOpen ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                className="h-[2px] w-6 bg-current transition-colors"
              />
              <motion.span
                animate={isMobileMenuOpen ? { rotate: -45, y: -8.5 } : { rotate: 0, y: 0 }}
                className="h-[2px] w-6 bg-current transition-colors"
                style={{ originX: "50%", originY: "50%" }}
              />
            </button>
            <Link href="/" className="transition-opacity hover:opacity-80">
              <img src="/images/logo.webp" alt="Logo" className="h-10 md:h-12 w-auto object-contain dark:brightness-0 dark:invert" />
            </Link>
          </div>

          <nav className="hidden md:flex items-center bg-gray-50 dark:bg-muted/50 rounded-full px-2 py-1 space-x-1">
            {[
              { name: "Home", href: "/" },
              { name: "Shop", href: "/products" },
              { name: "New Collection", href: "/new-collection" },
              { name: "Contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium px-4 py-2 rounded-full transition-all ${
                  location === item.href
                    ? "bg-white dark:bg-background shadow-sm"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <SearchBar />

            <button 
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            >
              {theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>



            {isAuthenticated && user && (user.role === "admin" || user.role === "staff") && (
              <button
                type="button"
                title="Admin Dashboard"
                onClick={() => setLocation("/admin")}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 text-emerald-500" />
              </button>
            )}

            {cartItemsCount > 0 && (
              <Link
                href="/cart"
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-muted transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold">
                  {cartItemsCount}
                </span>
              </Link>
            )}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full object-cover border-2 border-black/10 dark:border-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-semibold">
                    {initials}
                  </div>
                )}
                {user.role !== "admin" && user.role !== "staff" && (
                  <button
                    onClick={() => logout()}
                    className="hidden sm:inline text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                  >
                    Logout
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-neutral-950 z-[70] shadow-2xl p-8 pt-24 flex flex-col"
            >
              <nav className="flex flex-col space-y-2 mb-12">
                {[
                  { name: "Home", href: "/" },
                  { name: "Shop", href: "/products" },
                  { name: "New Collection", href: "/new-collection" },
                  { name: "Contact", href: "/contact" },
                ].map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (i * 0.05) }}
                  >
                    <Link
                      href={item.href}
                      className={`block px-6 py-4 rounded-full text-lg font-bold tracking-tight transition-all ${
                        location === item.href
                          ? "bg-black text-white dark:bg-white dark:text-black scale-[1.02] shadow-lg"
                          : "text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-primary"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <div className="mt-auto space-y-6 border-t pt-8 border-gray-100 dark:border-neutral-900">
                {!isAuthenticated ? null : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col space-y-4"
                  >
                    <div className="flex flex-col gap-4 p-4 bg-gray-50 dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {user?.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt={user?.name || user?.email}
                              className="w-12 h-12 rounded-full object-cover border-2 border-black/10 dark:border-white/10 shadow-inner"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-sm font-bold shadow-inner">
                              {initials}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-black truncate max-w-[140px] tracking-tight">
                              {user?.name || user?.email}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">
                              {user?.role}
                            </span>
                          </div>
                        </div>
                        {(user?.role === "admin" || user?.role === "staff") && (
                          <button
                            onClick={() => setLocation("/admin")}
                            className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white dark:bg-neutral-800 shadow-sm border border-gray-100 dark:border-neutral-700 hover:scale-105 active:scale-95 transition-transform"
                            title="Admin Dashboard"
                          >
                            <LayoutDashboard className="w-5 h-5 text-emerald-500" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => logout()}
                        className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] uppercase font-black tracking-[0.2em] transition-all shadow-lg shadow-red-500/20 active:scale-95"
                      >
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <div className="flex justify-between items-center px-4">
                  <div className="flex flex-col">
                    <p className="text-[9px] uppercase tracking-[0.4em] font-black text-gray-400 mb-1">
                      Elite Craftsmanship
                    </p>
                    <p className="text-[9px] uppercase tracking-[0.4em] font-black text-gray-300">
                      Rare Atelier &copy; 2025
                    </p>
                  </div>
                  <div className="flex items-center gap-2">

                    <button 
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 dark:bg-neutral-900 hover:scale-105 transition-transform"
                    >
                      {theme === "light" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
```

- **Visitors**: No admin icon in desktop or mobile navbar
- **Admin/Staff users**: Green dashboard icon in desktop navbar, dashboard button in mobile menu

---

### 3. NewCollection Dark/Light Mode Fixed

```diff:NewCollection.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories, type ProductApi } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

// Masonry layout assignment: vary aspect ratios for visual interest
const ASPECT_PATTERNS = [
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
];

function getAspect(index: number) {
  return ASPECT_PATTERNS[index % ASPECT_PATTERNS.length];
}

// Scroll-reveal hook using IntersectionObserver
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function RevealImage({
  product,
  index,
}: {
  product: ProductApi;
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  const aspect = getAspect(index);
  const [isHovered, setIsHovered] = useState(false);

  // Parse gallery URLs
  const gallery = useMemo(() => {
    try {
      return product.galleryUrls ? JSON.parse(product.galleryUrls) : [];
    } catch (e) {
      return [];
    }
  }, [product.galleryUrls]);

  const secondaryImage = gallery.length > 1 ? gallery[1] : null;

  // Calculate sale percentage
  const salePercentage = useMemo(() => {
    if (!product.originalPrice || Number(product.originalPrice) <= product.price) return null;
    const orig = Number(product.originalPrice);
    const curr = product.price;
    return Math.round(((orig - curr) / orig) * 100);
  }, [product.originalPrice, product.price]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${(index % 4) * 80}ms` }}
    >
      <Link 
        href={`/product/${product.id}`} 
        className="group block relative overflow-hidden rounded-sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`${aspect} overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative`}>
          {/* Primary Image */}
          <img
            src={product.imageUrl ?? ""}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
              isHovered && secondaryImage ? "opacity-0 scale-110" : "opacity-100 scale-100"
            }`}
          />
          
          {/* Secondary Image (Cross-fade on hover) */}
          {secondaryImage && (
            <img
              src={secondaryImage}
              alt={`${product.name} alternate view`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
                isHovered ? "opacity-100 scale-110" : "opacity-0 scale-100"
              }`}
            />
          )}

          {/* Sale Badge */}
          {salePercentage && (
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-600 border border-red-500 rounded-sm z-10 shadow-lg shadow-red-900/40">
              <span className="text-xs font-black tracking-widest text-white uppercase italic">
                -{salePercentage}% OFF
              </span>
            </div>
          )}

          {/* Hover overlay with Text */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent w-full h-full transition-all duration-700 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.4em] text-white/90 font-bold drop-shadow-md">View Collection</span>
                    <h3 className="text-xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">{product.name}</h3>
                </div>
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500 shadow-xl">
              <ArrowUpRight className="w-4 h-4 text-black" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`${getAspect(i)} bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse break-inside-avoid`}
        />
      ))}
    </div>
  );
}

export default function NewCollection() {
  const { data: products, isLoading } = useQuery<ProductApi[]>({
    queryKey: ["products", "all-collection"],
    queryFn: () => fetchProducts(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const getCategoryDisplayName = (slug: string) => {
    if (slug === "uncategorized") return "Other";
    const c = categories.find((x) => x.slug === slug);
    return (
      c?.name ??
      slug
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (w) => w.toUpperCase())
    );
  };

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products]
      .filter((p) => !!p.imageUrl) // Only show products with a real image
      .sort((a, b) => {
        const rankA = a.ranking ?? 999;
        const rankB = b.ranking ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [products]);

  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Hero Banner */}
      <section className="relative w-full py-28 md:py-40 overflow-hidden bg-neutral-950">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-800/20 via-transparent to-transparent" />

        <div className="relative container mx-auto px-6 text-center">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-neutral-500 font-bold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            Curated Pieces, Captured in Detail
          </p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-none animate-in fade-in slide-in-from-bottom-4 duration-1000">
            The Collection
          </h1>
          <div className="mt-8 flex justify-center gap-3 animate-in fade-in duration-1000" style={{ animationDelay: "400ms" }}>
            <div className="h-px w-16 bg-neutral-700 self-center" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-neutral-600 font-medium">
              {products ? products.length : "—"} Pieces
            </span>
            <div className="h-px w-16 bg-neutral-700 self-center" />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 max-w-7xl">
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <BrandedLoader />
          </div>
        ) : (
          <div className="columns-2 md:columns-3 xl:columns-4 gap-3 md:gap-4">
            {sortedProducts.map((product, i) => (
              <div key={product.id} className="break-inside-avoid mb-3 md:mb-4">
                <RevealImage product={product} index={i} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && products && products.length === 0 && (
          <div className="py-20 text-center">
            <p className="uppercase text-[10px] tracking-widest font-bold text-neutral-400">
              No products found.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
===
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories, type ProductApi } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

// Masonry layout assignment: vary aspect ratios for visual interest
const ASPECT_PATTERNS = [
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[4/5]",
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
];

function getAspect(index: number) {
  return ASPECT_PATTERNS[index % ASPECT_PATTERNS.length];
}

// Scroll-reveal hook using IntersectionObserver
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function RevealImage({
  product,
  index,
}: {
  product: ProductApi;
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  const aspect = getAspect(index);
  const [isHovered, setIsHovered] = useState(false);

  // Parse gallery URLs
  const gallery = useMemo(() => {
    try {
      return product.galleryUrls ? JSON.parse(product.galleryUrls) : [];
    } catch (e) {
      return [];
    }
  }, [product.galleryUrls]);

  const secondaryImage = gallery.length > 1 ? gallery[1] : null;

  // Calculate sale percentage
  const salePercentage = useMemo(() => {
    if (!product.originalPrice || Number(product.originalPrice) <= product.price) return null;
    const orig = Number(product.originalPrice);
    const curr = product.price;
    return Math.round(((orig - curr) / orig) * 100);
  }, [product.originalPrice, product.price]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${(index % 4) * 80}ms` }}
    >
      <Link 
        href={`/product/${product.id}`} 
        className="group block relative overflow-hidden rounded-sm"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`${aspect} overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative`}>
          {/* Primary Image */}
          <img
            src={product.imageUrl ?? ""}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
              isHovered && secondaryImage ? "opacity-0 scale-110" : "opacity-100 scale-100"
            }`}
          />
          
          {/* Secondary Image (Cross-fade on hover) */}
          {secondaryImage && (
            <img
              src={secondaryImage}
              alt={`${product.name} alternate view`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-out ${
                isHovered ? "opacity-100 scale-110" : "opacity-0 scale-100"
              }`}
            />
          )}

          {/* Sale Badge */}
          {salePercentage && (
            <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-600 border border-red-500 rounded-sm z-10 shadow-lg shadow-red-900/40">
              <span className="text-xs font-black tracking-widest text-white uppercase italic">
                -{salePercentage}% OFF
              </span>
            </div>
          )}

          {/* Hover overlay with Text */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent w-full h-full transition-all duration-700 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.4em] text-white/90 font-bold drop-shadow-md">View Collection</span>
                    <h3 className="text-xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">{product.name}</h3>
                </div>
            </div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500 shadow-xl">
              <ArrowUpRight className="w-4 h-4 text-black" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`${getAspect(i)} bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse break-inside-avoid`}
        />
      ))}
    </div>
  );
}

export default function NewCollection() {
  const { data: products, isLoading } = useQuery<ProductApi[]>({
    queryKey: ["products", "all-collection"],
    queryFn: () => fetchProducts(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const getCategoryDisplayName = (slug: string) => {
    if (slug === "uncategorized") return "Other";
    const c = categories.find((x) => x.slug === slug);
    return (
      c?.name ??
      slug
        .replace(/_/g, " ")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (w) => w.toUpperCase())
    );
  };

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products]
      .filter((p) => !!p.imageUrl) // Only show products with a real image
      .sort((a, b) => {
        const rankA = a.ranking ?? 999;
        const rankB = b.ranking ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [products]);

  return (
    <div className="flex flex-col min-h-screen pt-20">
      {/* Hero Banner */}
      <section className="relative w-full py-28 md:py-40 overflow-hidden bg-neutral-100 dark:bg-neutral-950">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-black/[0.03] dark:bg-white/[0.03] blur-3xl" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-300/20 dark:from-neutral-800/20 via-transparent to-transparent" />

        <div className="relative container mx-auto px-6 text-center">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] text-neutral-400 dark:text-neutral-500 font-bold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            Curated Pieces, Captured in Detail
          </p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-foreground dark:text-white tracking-tight leading-none animate-in fade-in slide-in-from-bottom-4 duration-1000">
            The Collection
          </h1>
          <div className="mt-8 flex justify-center gap-3 animate-in fade-in duration-1000" style={{ animationDelay: "400ms" }}>
            <div className="h-px w-16 bg-neutral-300 dark:bg-neutral-700 self-center" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 dark:text-neutral-600 font-medium">
              {products ? products.length : "—"} Pieces
            </span>
            <div className="h-px w-16 bg-neutral-300 dark:bg-neutral-700 self-center" />
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-16 md:py-24 container mx-auto px-4 md:px-6 max-w-7xl">
        {isLoading ? (
          <div className="py-20 flex items-center justify-center">
            <BrandedLoader />
          </div>
        ) : (
          <div className="columns-2 md:columns-3 xl:columns-4 gap-3 md:gap-4">
            {sortedProducts.map((product, i) => (
              <div key={product.id} className="break-inside-avoid mb-3 md:mb-4">
                <RevealImage product={product} index={i} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && products && products.length === 0 && (
          <div className="py-20 text-center">
            <p className="uppercase text-[10px] tracking-widest font-bold text-neutral-400">
              No products found.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
```

Hero section now uses `bg-neutral-100 dark:bg-neutral-950` with theme-aware text and divider colors.

![New Collection in light mode](/home/nikesh/.gemini/antigravity/brain/8d72eefb-9238-40f2-be0c-ce098ecd47bf/new_collection_light_mode.png)

---

### 4. Tablet Responsiveness Fixed

CTA group repositioned to `md:items-end md:pb-20` to prevent overlap with "Beyond Trends" text on tablet viewports.

---

### 5. Mobile Featured Collection Slideshow

```diff:Home.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { Link } from "wouter";
import { ExternalLink, Sparkles, Star, Gem, Diamond, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, type ProductApi } from "@/lib/api";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const HERO_IMAGES = [
  "/images/landingpage3.webp",
  "/images/landingpage4.webp",
  "/images/hero_premium_1.webp"
];

const LIFESTYLE_IMAGES = [
  "/images/feature_premium_1.webp",
  "/images/feature2.webp",
  "/images/feature3.webp",
];


export default function Home() {
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -200]);

  const { data: featuredProducts = [], isSuccess: isFeaturedSuccess } = useQuery({
    queryKey: ["products", "featured", { limit: 2 }],
    queryFn: () => fetchProducts({ limit: 2 }),
  });

  const { data: newArrivals = [], isSuccess: isNewArrivalsSuccess } = useQuery({
    queryKey: ["products", "new-arrivals", { limit: 4 }],
    queryFn: () => fetchProducts({ limit: 4 }),
  });

  // Finish pre-loader only when data is ready (Hydration-First)
  useEffect(() => {
    if (isFeaturedSuccess && isNewArrivalsSuccess) {
      // Small delay to ensure browser paint
      const timer = setTimeout(() => {
        if (typeof (window as any).finishLoading === 'function') {
          (window as any).finishLoading();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFeaturedSuccess, isNewArrivalsSuccess]);

  // Preload static campaign images
  useEffect(() => {
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    LIFESTYLE_IMAGES.forEach((src) => {
      if (!src.startsWith('http')) {
        const img = new Image();
        img.src = src;
      }
    });
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCarouselIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const goNext = useCallback(() => {
    goToSlide((carouselIndex + 1) % LIFESTYLE_IMAGES.length);
  }, [carouselIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide((carouselIndex - 1 + LIFESTYLE_IMAGES.length) % LIFESTYLE_IMAGES.length);
  }, [carouselIndex, goToSlide]);

  // Pause auto-scroll on interaction, resume after 5s
  const pauseAutoScroll = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      autoPlayRef.current = setInterval(() => {
        setCarouselIndex((i) => (i + 1) % LIFESTYLE_IMAGES.length);
      }, 5000);
    }, 5000);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % LIFESTYLE_IMAGES.length);
    }, 5000);
    
    const heroTimer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 8000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      clearInterval(heroTimer);
    };
  }, []);

  const newsletterMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/newsletter/subscribe", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "You've successfully joined our newsletter.",
      });
      setNewsletterEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    newsletterMutation.mutate(newsletterEmail);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    pauseAutoScroll();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    pauseAutoScroll();
    e.preventDefault();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = dragStartX.current - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };
  const handleMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <Helmet>
        <title>Rare Atelier | Home - Premium Streetwear</title>
        <meta name="description" content="Welcome to Rare Atelier. Explore our premium streetwear and minimal luxury collection. Authentic style, timeless designs." />
        <meta property="og:title" content="Rare Atelier | Premium Streetwear" />
        <meta property="og:url" content={window.location.origin} />
      </Helmet>
      {/* Hero Section */}
      <section className="relative h-[90vh] w-full overflow-hidden bg-neutral-900">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={heroIndex}
            initial={heroIndex === 0 ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="absolute inset-0 w-full h-full"
          >
            <OptimizedImage
              src={HERO_IMAGES[heroIndex]}
              alt="Luxury street style campaign"
              className="w-full h-full object-cover"
              priority={heroIndex === 0}
              loading={heroIndex === 0 ? "eager" : "lazy"}
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/40 dark:bg-luminous-glow transition-colors duration-700 pointer-events-none" />

        {/* Editorial Left Text Section */}
        <div className="absolute inset-0 flex items-start md:items-center container mx-auto px-6 sm:px-12 md:px-16 pt-32 sm:pt-40 md:pt-0 pointer-events-none z-10">
          <div className="flex items-center gap-6 md:gap-12 pl-2">
            {/* Elegant Vertical Line */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "clamp(120px, 20vh, 180px)", opacity: 0.4 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="w-px bg-white hidden md:block"
            />
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-white flex flex-col items-start w-full"
            >
              {/* Premium Archival Detail */}
              <span className="text-[9px] md:text-xs tracking-[0.4em] md:tracking-[0.5em] opacity-40 font-bold mb-4 md:mb-6 block uppercase">
                [W'25/ARCHIVE]
              </span>
              
              <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-semibold leading-[0.9] tracking-tighter shadow-black/20 text-shadow-sm">
                Beyond
                <br />
                Trends.
              </h1>
              
              <p className="mt-4 md:mt-8 text-xl sm:text-3xl md:text-4xl font-serif italic opacity-70 tracking-wide text-shadow-sm">
                Beyond Time.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Center CTA group with stagger animation */}
        <div className="absolute inset-0 flex items-end justify-center pb-24 sm:pb-32 md:pb-0 md:items-center pt-0 md:pt-0 pointer-events-none z-20">
          <div className="flex flex-col items-center gap-4 md:gap-5 pointer-events-auto">
            {/* Animated reveal line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-12 md:w-16 h-px bg-white/50 origin-center hidden md:block"
            />

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button
                size="lg"
                asChild
                className="rounded-none bg-white text-black hover:bg-white/90 px-8 sm:px-12 md:px-16 h-12 sm:h-14 md:h-15 text-[9px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] font-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl hero-btn-glow group"
              >
                <Link href="/products" className="flex items-center gap-3">
                  Explore Shop
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </Button>
            </motion.div>

            {/* Tagline below button */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
              className="text-[8px] md:text-[11px] tracking-[0.5em] md:tracking-[0.7em] uppercase text-white font-bold text-shadow-sm mt-1 md:mt-0"
            >
              Authenticity In Motion
            </motion.p>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-16 md:py-20 bg-neutral-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        
        {/* Floating/revolving animated icons */}
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-[15%] left-[10%] w-5 h-5 text-white/20 animate-float" />
          <Star className="absolute top-[20%] right-[12%] w-4 h-4 text-white/15 animate-float-delayed" />
          <Gem className="absolute bottom-[20%] left-[8%] w-4 h-4 text-white/15 animate-float-delayed" style={{ animationDelay: '1s' }} />
          <Diamond className="absolute bottom-[25%] right-[15%] w-5 h-5 text-white/20 animate-float" style={{ animationDelay: '2s' }} />
          <Sparkles className="absolute top-[50%] left-[5%] w-3 h-3 text-white/10 animate-sparkle" style={{ animationDelay: '0.5s' }} />
          <Star className="absolute top-[40%] right-[6%] w-3 h-3 text-white/10 animate-sparkle" style={{ animationDelay: '1.5s' }} />
          {/* Revolving icon around quote center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Diamond className="w-3 h-3 text-white/15 animate-revolve" />
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex items-center gap-4 shrink-0 relative">
              {/* Fading image with organic shape */}
              <div className="relative w-20 h-20 md:w-24 md:h-24">
                <div 
                  className="w-full h-full animate-in fade-in zoom-in duration-700"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                >
                  <OptimizedImage
                    src="/images/walter-landor.webp"
                    alt="Walter Landor"
                    className="w-full h-full object-cover"
                    fallbackExt="png"
                  />

                </div>
                {/* Fading glow around the shape */}
                <div 
                  className="absolute inset-[-4px] bg-gradient-to-br from-white/20 via-transparent to-white/10 blur-sm -z-10"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2 items-center">
                  <Sparkles className="w-3 h-3 text-white/50 animate-sparkle" />
                  <Gem className="w-3 h-3 text-white/30 animate-sparkle" style={{ animationDelay: '1s' }} />
                  <Star className="w-3 h-3 text-white/20 animate-sparkle" style={{ animationDelay: '2s' }} />
                </div>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-4xl italic font-serif text-white/95 leading-snug animate-in fade-in slide-in-from-bottom-4 duration-700">
                &ldquo;Products are made in a factory but brands are created in the mind.&rdquo;
              </p>
              <div className="mt-6 flex items-center justify-center md:justify-start gap-4">
                <div className="h-px flex-1 max-w-12 bg-white/30" />
                <p className="text-xs tracking-[0.3em] uppercase text-neutral-400 font-bold">
                  Walter Landor
                </p>
                <div className="h-px flex-1 max-w-12 bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-24 container mx-auto px-6 max-w-7xl">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Editor's Choice
            </h2>
            <h3 className="text-4xl font-black uppercase tracking-tighter">
              Featured Collection
            </h3>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold uppercase tracking-widest border-b border-black pb-1 hover:opacity-60 transition-opacity"
          >
            View All
          </Link>
        </div>

        {/* Lifestyle carousel — swipeable with slide transitions */}
        <div
          className="relative aspect-video md:aspect-[21/9] overflow-hidden rounded-sm mb-16 bg-neutral-100 dark:bg-neutral-900 cursor-grab active:cursor-grabbing select-none group/carousel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Sliding images container */}
          <div
            className="flex h-full transition-transform duration-600 ease-in-out"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {LIFESTYLE_IMAGES.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Featured collection image ${i + 1}`}
                className="w-full h-full object-cover flex-shrink-0"
                draggable={false}
              />
            ))}
          </div>

          {/* Left arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); goNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dynamic dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2.5 items-center bg-black/20 backdrop-blur-sm rounded-full px-3 py-2">
            {LIFESTYLE_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); goToSlide(i); }}
                className={`rounded-full transition-all duration-500 ease-out ${
                  i === carouselIndex
                    ? "w-7 h-2.5 bg-white shadow-lg shadow-white/30"
                    : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70 hover:scale-125"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredProducts.map((product, i) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group cursor-pointer relative"
            >
              <div className="relative overflow-hidden bg-gray-50 dark:bg-muted/30 aspect-[4/5] rounded-xl shadow-2xl transition-all duration-300 hover:shadow-white/5">
                <AnimatePresence mode="wait">
                  <motion.div
                    className="absolute inset-0 z-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                  >
                    {/* Primary Image */}
                    <OptimizedImage
                      src={i === 0 ? "/images/hoodie_left_landscape.webp" : i === 1 ? "/images/hoodie_right_landscape.webp" : (product.galleryUrls ? JSON.parse(product.galleryUrls)[0] : product.imageUrl ?? "")}
                      alt={`${product.name} lifestyle`}
                      className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                      priority={i < 2}
                    />
                    {/* Secondary Image (Model/Action) */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <OptimizedImage
                        src={product.imageUrl ?? ""}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Dark Gradient Overlay on Hover for Text Visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

                {/* Glassmorphism Detail Reveal */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute inset-x-4 bottom-4 z-20 p-6 backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-xl flex justify-between items-center"
                >
                  <div>
                    <h3 className="text-white text-xl font-black uppercase tracking-tighter mb-1">
                      {product.name}
                    </h3>
                    {product.saleActive && Number(product.salePercentage) > 0 ? (
                      <div className="flex items-center gap-2">
                        <p className="text-white font-black text-lg">
                          {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                        </p>
                        <p className="text-white/50 font-medium text-sm line-through">
                          {formatPrice(product.price)}
                        </p>
                        <span className="bg-white text-black text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm">
                          {product.salePercentage}% OFF
                        </span>
                      </div>
                    ) : (
                      <p className="text-white/70 font-medium text-lg">
                        {formatPrice(product.price)}
                      </p>
                    )}
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </motion.div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/product/${product.id}`, "_blank");
                  }}
                  className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Campaign Banner - Final Refined Transparency & Logo Sizing */}
      <section className="relative h-[80vh] w-full overflow-hidden my-32 group/banner">
        <motion.div 
          style={{ y: yParallax }}
          className="absolute inset-0 w-full h-[120%] -top-[10%]"
        >
          <img
            alt="Campaign story"
            className="w-full h-full object-cover scale-110"
            src="/images/landingpage3.webp"
          />
        </motion.div>
        
        <div 
          className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover/banner:opacity-100 transition-opacity duration-1000"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
          }}
          style={{
            background: 'radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08) 0%, transparent 40%)'
          } as any}
        />

        <div className="absolute inset-0 bg-black/40 dark:bg-luminous-glow transition-colors duration-700" />
        
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12 z-20">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-xl w-full backdrop-blur-[2px] bg-transparent border border-white/10 p-6 md:p-10 text-center text-white rounded-3xl shadow-2xl overflow-hidden relative"
          >
            {/* Ambient revolving background elements inside glass */}
            <div className="absolute top-0 right-0 p-4">
               <Gem className="w-4 h-4 text-white/10 animate-revolve" />
            </div>
            
            <h2 className="text-[14px] md:text-lg font-black mb-4 tracking-[0.4em] uppercase leading-tight italic">
              Explore the <br/><span className="not-italic text-outline-white">journey behind.</span>
            </h2>
            <p className="text-[10px] md:text-xs opacity-60 font-bold tracking-[0.3em] uppercase max-w-sm mx-auto mb-8 leading-relaxed">
              Discover the meticulous craftsmanship and story of the Winter '25 collection.
            </p>
            <Button
              variant="outline"
              className="rounded-full px-8 h-12 border-white/20 text-white hover:bg-white hover:text-black transition-all uppercase text-[8px] tracking-[0.4em] font-black group/btn shadow-xl hover:shadow-white/20 active:scale-95"
              asChild
            >
              <Link href="/new-collection" className="flex items-center gap-3">
                Explore Collection <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1.5 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24 container mx-auto px-6 max-w-7xl">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-center text-muted-foreground mb-4">
          Latest Drops
        </h2>
        <h3 className="text-4xl font-black uppercase tracking-tighter text-center mb-20">
          New Arrivals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
          {newArrivals.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden bg-gray-50 dark:bg-muted/30 aspect-[3/4] mb-6 rounded-lg group-hover:shadow-xl transition-all duration-500">
                <motion.div
                  className="w-full h-full"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.8 }}
                >
                  <OptimizedImage
                    src={product.imageUrl ?? ""}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                  {/* Hover Secondary View */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-30 mix-blend-overlay transition-opacity duration-700 bg-white" />
                </motion.div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/product/${product.id}`, "_blank");
                  }}
                  className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-white/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>

                {/* Dynamic Price floating on hover */}
                <div className="absolute bottom-2 left-2 truncate opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none flex flex-col gap-1 items-start">
                   {product.saleActive && Number(product.salePercentage) > 0 && (
                     <span className="bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded shadow-xl animate-pulse">
                        {product.salePercentage}% OFF
                     </span>
                   )}
                   <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm font-bold tracking-widest uppercase flex items-center gap-2">
                    {product.saleActive && Number(product.salePercentage) > 0 ? (
                      <>
                        <span className="text-primary">
                          {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                        </span>
                        <span className="text-white/50 line-through text-[8px]">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      formatPrice(product.price)
                    )}
                   </span>
                </div>
              </div>
              <div className="px-1">
                <h3 className="text-xs font-black uppercase tracking-widest truncate mb-1 text-foreground/80 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer / Newsletter */}
      <footer className="bg-[#0A0A0A] text-white pt-32 pb-12">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-32">
            <div className="col-span-1">
              <img
                src="https://cdn2.blanxer.com/brand_logo/67cd36dcf133882caba612b4/67d00c07ef86879da12106aa.webp"
                alt="RARE"
                className="h-12 w-auto mb-8 object-contain brightness-0 invert"
              />
              <p className="text-gray-500 text-sm leading-relaxed tracking-wide">
                Khusibu, Nayabazar, Kathmandu
                <br />
                (+977)-9705208960
                <br />
                rarenepal999@gmail.com
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-400">
                Legals
              </h4>
              <ul className="space-y-4 text-xs tracking-widest">
                <li>
                  <Link
                    href="/shipping"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Terms of service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-400">
                Social
              </h4>
              <ul className="space-y-4 text-xs tracking-widest">
                <li>
                  <a href="https://www.facebook.com/rarenp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-gray-400 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/rare.np/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-gray-400 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
                    </svg>
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-400">
                Newsletter
              </h4>
              <p className="text-xs text-gray-500 mb-6 tracking-wide leading-relaxed">
                Sign up for early access to drops and exclusive stories.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex group border-b border-gray-800 focus-within:border-white transition-colors pb-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-transparent py-2 flex-1 focus:outline-none text-sm placeholder:text-gray-700"
                  placeholder="Email Address"
                />
                <button 
                  disabled={newsletterMutation.isPending}
                  className="text-[10px] font-bold uppercase tracking-widest ml-4 hover:opacity-60 transition-opacity disabled:opacity-50"
                >
                  {newsletterMutation.isPending ? "..." : "Join"}
                </button>
              </form>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] uppercase tracking-[0.3em] text-gray-600 font-bold">
          </div>
          <div className="mt-8 text-center">
            <a 
              href="https://www.nikeshuprety.com.np/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-[10px] uppercase tracking-[0.3em] font-black animate-pulse"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.8), rgba(255,255,255,0.2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% auto',
                animation: 'shimmer 3s ease-in-out infinite',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))',
              }}
            >
              0xn1ku-hacks
            </a>
            <style>{`
              @keyframes shimmer {
                0%, 100% { background-position: -200% center; opacity: 0.4; }
                50% { background-position: 200% center; opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      </footer>
    </div>
  );
}
===
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { Link } from "wouter";
import { ExternalLink, Sparkles, Star, Gem, Diamond, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, type ProductApi } from "@/lib/api";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const HERO_IMAGES = [
  "/images/landingpage3.webp",
  "/images/landingpage4.webp",
  "/images/hero_premium_1.webp"
];

const LIFESTYLE_IMAGES = [
  "/images/feature_premium_1.webp",
  "/images/feature2.webp",
  "/images/feature3.webp",
];

const FEATURED_STATIC_IMAGES = [
  "/images/hoodie_left_landscape.webp",
  "/images/hoodie_right_landscape.webp",
];

function FeaturedProductCard({ product, index }: { product: ProductApi; index: number }) {
  const [mobileImageIndex, setMobileImageIndex] = useState(0);

  // Parse gallery images for mobile slideshow
  const galleryImages = (() => {
    try {
      const urls = product.galleryUrls ? JSON.parse(product.galleryUrls) : [];
      const mainImg = product.imageUrl ?? "";
      const all = mainImg ? [mainImg, ...urls] : [...urls];
      return all.length > 0 ? all : [mainImg];
    } catch {
      return [product.imageUrl ?? ""];
    }
  })();

  // Auto-cycle images on mobile
  useEffect(() => {
    if (galleryImages.length <= 1) return;
    const timer = setInterval(() => {
      setMobileImageIndex((prev) => (prev + 1) % galleryImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [galleryImages.length]);

  const staticImage = FEATURED_STATIC_IMAGES[index] ?? (product.galleryUrls ? JSON.parse(product.galleryUrls)[0] : product.imageUrl ?? "");

  return (
    <Link
      href={`/product/${product.id}`}
      className="group cursor-pointer relative"
    >
      <div className="relative overflow-hidden bg-gray-50 dark:bg-muted/30 aspect-[4/5] rounded-xl shadow-2xl transition-all duration-300 hover:shadow-white/5">
        {/* Desktop view — hover swap (hidden on mobile) */}
        <div className="hidden md:block absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              className="absolute inset-0 z-0"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            >
              <OptimizedImage
                src={staticImage}
                alt={`${product.name} lifestyle`}
                className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-0"
                priority={index < 2}
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <OptimizedImage
                  src={product.imageUrl ?? ""}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile view — auto-sliding gallery (hidden on desktop) */}
        <div className="md:hidden absolute inset-0 z-0">
          {galleryImages.map((src: string, imgIdx: number) => (
            <div
              key={imgIdx}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: imgIdx === mobileImageIndex ? 1 : 0 }}
            >
              <img
                src={src}
                alt={`${product.name} view ${imgIdx + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          {/* Slide indicators */}
          {galleryImages.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {galleryImages.map((_: string, dotIdx: number) => (
                <div
                  key={dotIdx}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    dotIdx === mobileImageIndex
                      ? "w-5 bg-white shadow-lg"
                      : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Desktop: Dark Gradient Overlay on Hover */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

        {/* Mobile: Always-visible gradient overlay */}
        <div className="md:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10" />

        {/* Desktop: Glassmorphism Detail Reveal on Hover */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="hidden md:flex absolute inset-x-4 bottom-4 z-20 p-6 backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-xl justify-between items-center"
        >
          <div>
            <h3 className="text-white text-xl font-black uppercase tracking-tighter mb-1">
              {product.name}
            </h3>
            {product.saleActive && Number(product.salePercentage) > 0 ? (
              <div className="flex items-center gap-2">
                <p className="text-white font-black text-lg">
                  {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                </p>
                <p className="text-white/50 font-medium text-sm line-through">
                  {formatPrice(product.price)}
                </p>
                <span className="bg-white text-black text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm">
                  {product.salePercentage}% OFF
                </span>
              </div>
            ) : (
              <p className="text-white/70 font-medium text-lg">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
            <ArrowRight className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Mobile: Always-visible product info */}
        <div className="md:hidden absolute inset-x-3 bottom-3 z-20 p-4 backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white text-base font-black uppercase tracking-tighter mb-0.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {product.name}
              </h3>
              {product.saleActive && Number(product.salePercentage) > 0 ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <p className="text-white font-black text-sm">
                    {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                  </p>
                  <p className="text-white/50 font-medium text-xs line-through">
                    {formatPrice(product.price)}
                  </p>
                  <span className="bg-white text-black text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-sm">
                    {product.salePercentage}% OFF
                  </span>
                </div>
              ) : (
                <p className="text-white/70 font-medium text-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Desktop: External link button on hover */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`/product/${product.id}`, "_blank");
          }}
          className="absolute top-4 right-4 z-30 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </Link>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);
  const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -200]);

  const { data: featuredProducts = [], isSuccess: isFeaturedSuccess } = useQuery({
    queryKey: ["products", "featured", { limit: 2 }],
    queryFn: () => fetchProducts({ limit: 2 }),
  });

  const { data: newArrivals = [], isSuccess: isNewArrivalsSuccess } = useQuery({
    queryKey: ["products", "new-arrivals", { limit: 4 }],
    queryFn: () => fetchProducts({ limit: 4 }),
  });

  // Finish pre-loader only when data is ready (Hydration-First)
  useEffect(() => {
    if (isFeaturedSuccess && isNewArrivalsSuccess) {
      // Small delay to ensure browser paint
      const timer = setTimeout(() => {
        if (typeof (window as any).finishLoading === 'function') {
          (window as any).finishLoading();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isFeaturedSuccess, isNewArrivalsSuccess]);

  // Preload static campaign images
  useEffect(() => {
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    LIFESTYLE_IMAGES.forEach((src) => {
      if (!src.startsWith('http')) {
        const img = new Image();
        img.src = src;
      }
    });
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCarouselIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  const goNext = useCallback(() => {
    goToSlide((carouselIndex + 1) % LIFESTYLE_IMAGES.length);
  }, [carouselIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide((carouselIndex - 1 + LIFESTYLE_IMAGES.length) % LIFESTYLE_IMAGES.length);
  }, [carouselIndex, goToSlide]);

  // Pause auto-scroll on interaction, resume after 5s
  const pauseAutoScroll = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      autoPlayRef.current = setInterval(() => {
        setCarouselIndex((i) => (i + 1) % LIFESTYLE_IMAGES.length);
      }, 5000);
    }, 5000);
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % LIFESTYLE_IMAGES.length);
    }, 5000);
    
    const heroTimer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 8000);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      clearInterval(heroTimer);
    };
  }, []);

  const newsletterMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/newsletter/subscribe", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "You've successfully joined our newsletter.",
      });
      setNewsletterEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    newsletterMutation.mutate(newsletterEmail);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    pauseAutoScroll();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    pauseAutoScroll();
    e.preventDefault();
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
  };
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = dragStartX.current - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };
  const handleMouseLeave = () => {
    if (isDragging.current) {
      isDragging.current = false;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-20">
      <Helmet>
        <title>Rare Atelier | Home - Premium Streetwear</title>
        <meta name="description" content="Welcome to Rare Atelier. Explore our premium streetwear and minimal luxury collection. Authentic style, timeless designs." />
        <meta property="og:title" content="Rare Atelier | Premium Streetwear" />
        <meta property="og:url" content={window.location.origin} />
      </Helmet>
      {/* Hero Section */}
      <section className="relative h-[90vh] w-full overflow-hidden bg-neutral-900">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={heroIndex}
            initial={heroIndex === 0 ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="absolute inset-0 w-full h-full"
          >
            <OptimizedImage
              src={HERO_IMAGES[heroIndex]}
              alt="Luxury street style campaign"
              className="w-full h-full object-cover"
              priority={heroIndex === 0}
              loading={heroIndex === 0 ? "eager" : "lazy"}
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/40 dark:bg-luminous-glow transition-colors duration-700 pointer-events-none" />

        {/* Editorial Left Text Section */}
        <div className="absolute inset-0 flex items-start md:items-center container mx-auto px-6 sm:px-12 md:px-16 pt-32 sm:pt-40 md:pt-0 pointer-events-none z-10">
          <div className="flex items-center gap-6 md:gap-12 pl-2">
            {/* Elegant Vertical Line */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "clamp(120px, 20vh, 180px)", opacity: 0.4 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="w-px bg-white hidden md:block"
            />
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-white flex flex-col items-start w-full"
            >
              {/* Premium Archival Detail */}
              <span className="text-[9px] md:text-xs tracking-[0.4em] md:tracking-[0.5em] opacity-40 font-bold mb-4 md:mb-6 block uppercase">
                [W'25/ARCHIVE]
              </span>
              
              <h1 className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-semibold leading-[0.9] tracking-tighter shadow-black/20 text-shadow-sm">
                Beyond
                <br />
                Trends.
              </h1>
              
              <p className="mt-4 md:mt-8 text-xl sm:text-3xl md:text-4xl font-serif italic opacity-70 tracking-wide text-shadow-sm">
                Beyond Time.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Center CTA group with stagger animation */}
        <div className="absolute inset-0 flex items-end justify-center pb-24 sm:pb-32 md:pb-20 md:items-end pt-0 md:pt-0 pointer-events-none z-20">
          <div className="flex flex-col items-center gap-4 md:gap-5 pointer-events-auto">
            {/* Animated reveal line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-12 md:w-16 h-px bg-white/50 origin-center hidden md:block"
            />

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Button
                size="lg"
                asChild
                className="rounded-none bg-white text-black hover:bg-white/90 px-8 sm:px-12 md:px-16 h-12 sm:h-14 md:h-15 text-[9px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] font-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl hero-btn-glow group"
              >
                <Link href="/products" className="flex items-center gap-3">
                  Explore Shop
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </Button>
            </motion.div>

            {/* Tagline below button */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }}
              className="text-[8px] md:text-[11px] tracking-[0.5em] md:tracking-[0.7em] uppercase text-white font-bold text-shadow-sm mt-1 md:mt-0"
            >
              Authenticity In Motion
            </motion.p>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-16 md:py-20 bg-neutral-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        
        {/* Floating/revolving animated icons */}
        <div className="absolute inset-0 pointer-events-none">
          <Sparkles className="absolute top-[15%] left-[10%] w-5 h-5 text-white/20 animate-float" />
          <Star className="absolute top-[20%] right-[12%] w-4 h-4 text-white/15 animate-float-delayed" />
          <Gem className="absolute bottom-[20%] left-[8%] w-4 h-4 text-white/15 animate-float-delayed" style={{ animationDelay: '1s' }} />
          <Diamond className="absolute bottom-[25%] right-[15%] w-5 h-5 text-white/20 animate-float" style={{ animationDelay: '2s' }} />
          <Sparkles className="absolute top-[50%] left-[5%] w-3 h-3 text-white/10 animate-sparkle" style={{ animationDelay: '0.5s' }} />
          <Star className="absolute top-[40%] right-[6%] w-3 h-3 text-white/10 animate-sparkle" style={{ animationDelay: '1.5s' }} />
          {/* Revolving icon around quote center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Diamond className="w-3 h-3 text-white/15 animate-revolve" />
          </div>
        </div>

        <div className="relative max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex items-center gap-4 shrink-0 relative">
              {/* Fading image with organic shape */}
              <div className="relative w-20 h-20 md:w-24 md:h-24">
                <div 
                  className="w-full h-full animate-in fade-in zoom-in duration-700"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                >
                  <OptimizedImage
                    src="/images/walter-landor.webp"
                    alt="Walter Landor"
                    className="w-full h-full object-cover"
                    fallbackExt="png"
                  />

                </div>
                {/* Fading glow around the shape */}
                <div 
                  className="absolute inset-[-4px] bg-gradient-to-br from-white/20 via-transparent to-white/10 blur-sm -z-10"
                  style={{
                    clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2 items-center">
                  <Sparkles className="w-3 h-3 text-white/50 animate-sparkle" />
                  <Gem className="w-3 h-3 text-white/30 animate-sparkle" style={{ animationDelay: '1s' }} />
                  <Star className="w-3 h-3 text-white/20 animate-sparkle" style={{ animationDelay: '2s' }} />
                </div>
              </div>
            </div>
            <div className="text-center md:text-left">
              <p className="text-2xl md:text-4xl italic font-serif text-white/95 leading-snug animate-in fade-in slide-in-from-bottom-4 duration-700">
                &ldquo;Products are made in a factory but brands are created in the mind.&rdquo;
              </p>
              <div className="mt-6 flex items-center justify-center md:justify-start gap-4">
                <div className="h-px flex-1 max-w-12 bg-white/30" />
                <p className="text-xs tracking-[0.3em] uppercase text-neutral-400 font-bold">
                  Walter Landor
                </p>
                <div className="h-px flex-1 max-w-12 bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection */}
      <section className="py-24 container mx-auto px-6 max-w-7xl">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground mb-2">
              Editor's Choice
            </h2>
            <h3 className="text-4xl font-black uppercase tracking-tighter">
              Featured Collection
            </h3>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold uppercase tracking-widest border-b border-black pb-1 hover:opacity-60 transition-opacity"
          >
            View All
          </Link>
        </div>

        {/* Lifestyle carousel — swipeable with slide transitions */}
        <div
          className="relative aspect-video md:aspect-[21/9] overflow-hidden rounded-sm mb-16 bg-neutral-100 dark:bg-neutral-900 cursor-grab active:cursor-grabbing select-none group/carousel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Sliding images container */}
          <div
            className="flex h-full transition-transform duration-600 ease-in-out"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {LIFESTYLE_IMAGES.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Featured collection image ${i + 1}`}
                className="w-full h-full object-cover flex-shrink-0"
                draggable={false}
              />
            ))}
          </div>

          {/* Left arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); goPrev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Right arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); goNext(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-black/60 hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dynamic dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2.5 items-center bg-black/20 backdrop-blur-sm rounded-full px-3 py-2">
            {LIFESTYLE_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); pauseAutoScroll(); goToSlide(i); }}
                className={`rounded-full transition-all duration-500 ease-out ${
                  i === carouselIndex
                    ? "w-7 h-2.5 bg-white shadow-lg shadow-white/30"
                    : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70 hover:scale-125"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featuredProducts.map((product, i) => (
            <FeaturedProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      {/* Campaign Banner - Final Refined Transparency & Logo Sizing */}
      <section className="relative h-[80vh] w-full overflow-hidden my-32 group/banner">
        <motion.div 
          style={{ y: yParallax }}
          className="absolute inset-0 w-full h-[120%] -top-[10%]"
        >
          <img
            alt="Campaign story"
            className="w-full h-full object-cover scale-110"
            src="/images/landingpage3.webp"
          />
        </motion.div>
        
        <div 
          className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover/banner:opacity-100 transition-opacity duration-1000"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
            e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
          }}
          style={{
            background: 'radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08) 0%, transparent 40%)'
          } as any}
        />

        <div className="absolute inset-0 bg-black/40 dark:bg-luminous-glow transition-colors duration-700" />
        
        <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-12 z-20">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-xl w-full backdrop-blur-[2px] bg-transparent border border-white/10 p-6 md:p-10 text-center text-white rounded-3xl shadow-2xl overflow-hidden relative"
          >
            {/* Ambient revolving background elements inside glass */}
            <div className="absolute top-0 right-0 p-4">
               <Gem className="w-4 h-4 text-white/10 animate-revolve" />
            </div>
            
            <h2 className="text-[14px] md:text-lg font-black mb-4 tracking-[0.4em] uppercase leading-tight italic">
              Explore the <br/><span className="not-italic text-outline-white">journey behind.</span>
            </h2>
            <p className="text-[10px] md:text-xs opacity-60 font-bold tracking-[0.3em] uppercase max-w-sm mx-auto mb-8 leading-relaxed">
              Discover the meticulous craftsmanship and story of the Winter '25 collection.
            </p>
            <Button
              variant="outline"
              className="rounded-full px-8 h-12 border-white/20 text-white hover:bg-white hover:text-black transition-all uppercase text-[8px] tracking-[0.4em] font-black group/btn shadow-xl hover:shadow-white/20 active:scale-95"
              asChild
            >
              <Link href="/new-collection" className="flex items-center gap-3">
                Explore Collection <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1.5 transition-transform" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-24 container mx-auto px-6 max-w-7xl">
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-center text-muted-foreground mb-4">
          Latest Drops
        </h2>
        <h3 className="text-4xl font-black uppercase tracking-tighter text-center mb-20">
          New Arrivals
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
          {newArrivals.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group cursor-pointer"
            >
              <div className="relative overflow-hidden bg-gray-50 dark:bg-muted/30 aspect-[3/4] mb-6 rounded-lg group-hover:shadow-xl transition-all duration-500">
                <motion.div
                  className="w-full h-full"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.8 }}
                >
                  <OptimizedImage
                    src={product.imageUrl ?? ""}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                  {/* Hover Secondary View */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-30 mix-blend-overlay transition-opacity duration-700 bg-white" />
                </motion.div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(`/product/${product.id}`, "_blank");
                  }}
                  className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity border border-white/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>

                {/* Dynamic Price floating on hover */}
                <div className="absolute bottom-2 left-2 truncate opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none flex flex-col gap-1 items-start">
                   {product.saleActive && Number(product.salePercentage) > 0 && (
                     <span className="bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded shadow-xl animate-pulse">
                        {product.salePercentage}% OFF
                     </span>
                   )}
                   <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm font-bold tracking-widest uppercase flex items-center gap-2">
                    {product.saleActive && Number(product.salePercentage) > 0 ? (
                      <>
                        <span className="text-primary">
                          {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                        </span>
                        <span className="text-white/50 line-through text-[8px]">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      formatPrice(product.price)
                    )}
                   </span>
                </div>
              </div>
              <div className="px-1">
                <h3 className="text-xs font-black uppercase tracking-widest truncate mb-1 text-foreground/80 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer / Newsletter */}
      <footer className="bg-[#0A0A0A] text-white pt-32 pb-12">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-32">
            <div className="col-span-1">
              <img
                src="https://cdn2.blanxer.com/brand_logo/67cd36dcf133882caba612b4/67d00c07ef86879da12106aa.webp"
                alt="RARE"
                className="h-12 w-auto mb-8 object-contain brightness-0 invert"
              />
              <p className="text-gray-500 text-sm leading-relaxed tracking-wide">
                Khusibu, Nayabazar, Kathmandu
                <br />
                (+977)-9705208960
                <br />
                rarenepal999@gmail.com
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-400">
                Legals
              </h4>
              <ul className="space-y-4 text-xs tracking-widest">
                <li>
                  <Link
                    href="/shipping"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/refund"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Refund Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-gray-400 transition-colors"
                  >
                    Terms of service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-400">
                Social
              </h4>
              <ul className="space-y-4 text-xs tracking-widest">
                <li>
                  <a href="https://www.facebook.com/rarenp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-gray-400 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                </li>
                <li>
                  <a href="https://www.instagram.com/rare.np/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-gray-400 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
                    </svg>
                    Instagram
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-8 uppercase tracking-[0.2em] text-[10px] text-gray-400">
                Newsletter
              </h4>
              <p className="text-xs text-gray-500 mb-6 tracking-wide leading-relaxed">
                Sign up for early access to drops and exclusive stories.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="flex group border-b border-gray-800 focus-within:border-white transition-colors pb-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-transparent py-2 flex-1 focus:outline-none text-sm placeholder:text-gray-700"
                  placeholder="Email Address"
                />
                <button 
                  disabled={newsletterMutation.isPending}
                  className="text-[10px] font-bold uppercase tracking-widest ml-4 hover:opacity-60 transition-opacity disabled:opacity-50"
                >
                  {newsletterMutation.isPending ? "..." : "Join"}
                </button>
              </form>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] uppercase tracking-[0.3em] text-gray-600 font-bold">
          </div>
          <div className="mt-8 text-center">
            <a 
              href="https://www.nikeshuprety.com.np/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-[10px] uppercase tracking-[0.3em] font-black animate-pulse"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.8), rgba(255,255,255,0.2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% auto',
                animation: 'shimmer 3s ease-in-out infinite',
                textShadow: 'none',
                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))',
              }}
            >
              0xn1ku-hacks
            </a>
            <style>{`
              @keyframes shimmer {
                0%, 100% { background-position: -200% center; opacity: 0.4; }
                50% { background-position: 200% center; opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

New [FeaturedProductCard](file:///home/nikesh/rr/client/src/pages/storefront/Home.tsx#33-208) component provides:
- **Desktop**: Existing hover-reveal behavior preserved
- **Mobile**: Auto-cycling image gallery (3s interval) with crossfade, always-visible product name/price overlay, slide indicators

## Verification

All fixes verified via browser testing:

![Browser verification recording](/home/nikesh/.gemini/antigravity/brain/8d72eefb-9238-40f2-be0c-ce098ecd47bf/verify_ui_fixes_1773377604720.webp)
