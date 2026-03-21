import { Link, useLocation } from "wouter";
import {
  LayoutGrid,
  User,
  Users,
  BarChart,
  Package,
  CreditCard,
  ShoppingBag,
  Receipt,
  Tags,
  Settings,
  LogOut,
  Megaphone,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { useAdminWebSocket } from "@/hooks/useAdminWebSocket";
import { ThemeToggle } from "@/components/admin/ThemeToggle";
import { NotificationBadge } from "@/components/admin/NotificationBadge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Suspense, useEffect, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";
import { TopLoadingBar } from "@/components/layout/TopLoadingBar";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
  SidebarInset,
} from "@/components/animate-ui/sidebar";
import { cn } from "@/lib/utils";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

const ADMIN_NAV = [
  { href: "/admin", icon: LayoutGrid, label: "Dashboard", type: "system" },
  { href: "/admin/analytics", icon: BarChart, label: "Analytics", type: "analytics" },
  { href: "/admin/products", icon: Package, label: "Products", type: "product" },
  { href: "/admin/orders", icon: ShoppingBag, label: "Orders", type: "order" },
  { href: "/admin/pos", icon: CreditCard, label: "Point of Sale", type: "pos" },
  { href: "/admin/bills", icon: Receipt, label: "Bills", type: "bill" },
  { href: "/admin/customers", icon: User, label: "Customers", type: "customer" },
  { href: "/admin/store-users", icon: Users, label: "Store Users", type: "team" },
  { href: "/admin/promo-codes", icon: Tags, label: "Promo Codes", type: "promo" },
  { href: "/admin/marketing", icon: Megaphone, label: "Marketing", type: "marketing" },
  { href: "/admin/images", icon: Images, label: "Images", type: "media" },
  { href: "/admin/storefront-images", icon: Settings, label: "Storefront Images", type: "system" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const pathname = location.split("?")[0];
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { getUnreadCountByType, markTypeRead } = useNotifications();
  useAdminWebSocket();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const isFetching = useIsFetching();
  const [isRouteChanging, setIsRouteChanging] = useState(false);

  useEffect(() => {
    setIsRouteChanging(true);
    const timeout = setTimeout(() => setIsRouteChanging(false), 400);
    return () => clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    localStorage.setItem(
      ADMIN_SIDEBAR_COLLAPSED_KEY,
      sidebarCollapsed ? "true" : "false",
    );
  }, [sidebarCollapsed]);

  const isLoading = isRouteChanging || isFetching > 0;

  const handleLogout = async () => {
    try {
      const res = await apiRequest("POST", "/api/auth/logout");
      if (res.ok) {
        window.location.href = "/admin/login";
      }
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || (user?.email?.[0] || "U").toUpperCase();

  const displayName = user?.name || user?.email || "User";
  const roleLabel =
    user?.role === "admin"
      ? "Admin"
      : user?.role === "staff"
        ? "Staff"
        : "Customer";

  return (
    <SidebarProvider
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
      style={
        {
          "--sidebar-width": "18rem",
          "--sidebar-width-icon": "56px",
        } as React.CSSProperties
      }
      className="min-h-screen bg-[#F5F5F3] dark:bg-neutral-900 text-[#2C3E2D] dark:text-foreground font-sans overflow-hidden transition-colors duration-200 ease-in-out"
    >
      <TopLoadingBar isLoading={isLoading} />
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border/50"
      >
        <SidebarHeader className="border-b border-sidebar-border/60 p-3">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <img
              src="/images/logo.webp"
              alt="Rare Logo"
              className="h-8 w-8 object-contain shrink-0"
            />
            <span className="font-black uppercase tracking-widest text-sm group-data-[collapsible=icon]:hidden">
              RARE.NP
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="sidebar-scrollbar">
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_NAV.map((item) => {
                const isActive = pathname === item.href;
                const count = getUnreadCountByType(item.type);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-11 rounded-xl font-black uppercase tracking-wider",
                        isActive &&
                          "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      )}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (count > 0) markTypeRead(item.type);
                        }}
                        data-testid={`link-admin-nav-${item.label.toLowerCase()}`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                        {count > 0 && (
                          <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black px-1 group-data-[collapsible=icon]:hidden">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Storefront</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/admin/landing-page"}
                  tooltip="Landing Page"
                  className={cn(
                    "h-11 rounded-xl font-black uppercase tracking-wider",
                    pathname === "/admin/landing-page" &&
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                  )}
                >
                  <Link href="/admin/landing-page">
                    <Images className="h-5 w-5 shrink-0" />
                    <span>Landing Page</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60 p-3">
          <Link
            href="/admin/profile"
            className="flex items-center gap-2 rounded-xl border border-sidebar-border/60 p-2"
          >
            <div className="w-8 h-8 rounded-full border border-sidebar-border overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center text-[10px] font-bold">
                  {initials}
                </div>
              )}
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-[11px] font-bold truncate uppercase tracking-wider">{displayName}</p>
              <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">{roleLabel}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
            <NotificationBadge />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-[10px]"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="flex min-w-0 h-screen overflow-hidden bg-[#F5F5F3] dark:bg-neutral-900 transition-colors duration-200 ease-in-out">
        <header className="h-20 bg-neutral-950 dark:bg-white border-b border-white/10 dark:border-black/5 flex items-center justify-between px-6 transition-colors duration-200 ease-in-out">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="text-white dark:text-black hover:bg-white/10 dark:hover:bg-black/10" />
            {(user?.role === "admin" || user?.role === "staff") && (
              <Link
                href="/admin/pos"
                className="inline-flex items-center gap-2 rounded-full bg-[#2C3E2D] text-white px-3 py-1.5 shadow-sm hover:bg-[#1A251B] transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">POS</span>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBadge />
            <Link
              href="/admin/profile"
              className="w-8 h-8 rounded-full border border-white/20 dark:border-black/20 overflow-hidden"
            >
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 dark:bg-black/5 flex items-center justify-center text-white dark:text-black text-[10px] font-bold">
                  {initials}
                </div>
              )}
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 lg:p-12 transition-colors duration-200 ease-in-out">
          <Suspense
            fallback={
              <div className="relative w-full">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden rounded-full">
                  <div
                    className="h-full w-1/3 bg-primary rounded-full animate-[shimmer_1s_ease-in-out_infinite]"
                    style={{ animation: "shimmer 1s ease-in-out infinite alternate", transformOrigin: "left" }}
                  />
                </div>
              </div>
            }
          >
            {children}
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}