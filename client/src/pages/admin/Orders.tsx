import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MapPin,
  MoreVertical,
  Package,
  Pencil,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportOrdersCSV,
  fetchAdminOrderFonepayAudit,
  fetchAdminOrdersPage,
  fetchAdminOrdersTrend,
  deleteAdminOrder,
  updateOrderStatus,
  verifyOrderPayment,
  fetchBillByOrder,
} from "@/lib/adminApi";
import type { AdminBill, AdminOrder, AdminOrderFonepayAudit } from "@/lib/adminApi";
import { ExportButton } from "@/components/admin/ExportButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, displayEmptyField } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/admin/Pagination";
import OrdersTrendChart from "@/components/admin/OrdersTrendChart";
import { getErrorMessage } from "@/lib/queryClient";

const BillViewer = lazy(() =>
  import("@/components/admin/BillViewer").then((module) => ({ default: module.BillViewer })),
);

function formatAdminNpr(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  if (Number.isNaN(num)) return "रू 0";
  return `रू ${num.toLocaleString("en-NP")}`;
}

function generateSparklinePoints(values: number[]): string {
  if (values.length < 2) return "";
  const w = 120, h = 36;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function buildOrderTrackingUrl(trackingToken?: string | null) {
  if (!trackingToken) return null;
  if (typeof window === "undefined") return `/orders/track/${trackingToken}`;
  return `${window.location.origin}/orders/track/${trackingToken}`;
}

function formatFonepayStageLabel(stage: string): string {
  return stage
    .split("_")
    .map((part) => {
      const normalized = part.toLowerCase();
      if (normalized === "qr") return "QR";
      if (normalized === "prn") return "PRN";
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

function getFonepayStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "success" || normalized === "verified") {
    return "bg-[#E8F3EB] text-[#2C5234] border-[#2C5234]/20 dark:bg-green-950 dark:text-green-300 dark:border-green-900";
  }
  if (normalized === "pending") {
    return "bg-[#FFF4E5] text-[#8C5A14] border-[#8C5A14]/20 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900";
  }
  if (normalized === "failed" || normalized === "error" || normalized === "rejected") {
    return "bg-[#FDECEC] text-[#9A2D2D] border-[#9A2D2D]/20 dark:bg-red-950 dark:text-red-300 dark:border-red-900";
  }
  return "bg-muted text-[#111827] border-border";
}

const ADMIN_ORDER_COLOR_SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f5",
  cream: "#f2eadf",
  ivory: "#fff8e7",
  beige: "#d8c3a5",
  brown: "#7a5a43",
  mocha: "#7b5b45",
  grey: "#7c7c7c",
  gray: "#7c7c7c",
  blue: "#2548b1",
  navy: "#1f2a44",
  "navy blue": "#1f2a44",
  green: "#2f7d32",
  red: "#c62828",
  maroon: "#6b1f2a",
  burgundy: "#6d213c",
  pink: "#f7a6ec",
  purple: "#7c3aed",
  yellow: "#facc15",
  orange: "#f97316",
  gold: "#c9a84c",
  stone: "#c8c1b5",
  espresso: "#4b3428",
};

function parseAdminColorOptions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function normalizeAdminOrderColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "default") return null;
  return trimmed;
}

function resolveAdminOrderItemColor(item: {
  variantColor?: string | null;
  color?: string | null;
  productColorOptions?: string | null;
  product?: { colorOptions?: string | null } | null;
}): string | null {
  return (
    normalizeAdminOrderColor(item.variantColor) ??
    normalizeAdminOrderColor(item.color) ??
    parseAdminColorOptions(item.product?.colorOptions ?? item.productColorOptions)[0] ??
    null
  );
}

function parseAdminOrderColorMeta(value: string): { label: string; swatch: string | null } {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/);
  const label = trimmed.replace(/\(\s*#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\s*\)/g, "").trim();
  const normalized = label.toLowerCase();
  return {
    label: label || trimmed,
    swatch: hexMatch?.[0] ?? ADMIN_ORDER_COLOR_SWATCHES[normalized] ?? null,
  };
}

function BillButton({ orderId }: { orderId: string }) {
  const [showBill, setShowBill] = useState(false);

  const { data, isLoading } = useQuery<AdminBill | null>({
    queryKey: ["bill", "order", orderId],
    queryFn: () => fetchBillByOrder(orderId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <div className="text-[#6B7280] text-xs">Loading…</div>;

  if (!data) return <div className="text-[#6B7280] text-xs">—</div>;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowBill(true); }}
        className="inline-flex h-7 items-center rounded-md border border-border bg-white px-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-700 transition-colors hover:bg-neutral-900 hover:text-white dark:text-neutral-200 dark:hover:bg-white dark:hover:text-black"
        title={`Bill ${data.billNumber}`}
      >
        View
      </button>

      {showBill && (
        <div className="bill-modal-overlay" onClick={() => setShowBill(false)}>
          <div className="bill-modal" onClick={e => e.stopPropagation()}>
            <Suspense fallback={<div className="p-6 text-sm text-[#6B7280]">Loading bill viewer...</div>}>
              <BillViewer bill={data} onClose={() => setShowBill(false)} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<"orders" | "chart">("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"all" | "1d" | "3d" | "7d">("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<AdminOrder | null>(null);
  const [selectedOrderSn, setSelectedOrderSn] = useState<number | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<
    Array<{
      id: string;
      productId: string;
      quantity: number;
      unitPrice: string | number;
      product?: { name?: string; colorOptions?: string | null } | null;
      size?: string;
      color?: string | null;
      variantColor?: string | null;
      productColorOptions?: string | null;
    }>
  >([]);
  const [selectedOrderItemsLoading, setSelectedOrderItemsLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(15);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [payTypeFilter, setPayTypeFilter] = useState<string>("");
  const [payStatusFilter, setPayStatusFilter] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const listFilters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search || undefined,
      page: orderPage,
      limit: orderPageSize,
      timeRange: timeRange === "all" ? undefined : timeRange,
    }),
    [orderPage, orderPageSize, search, statusFilter, timeRange],
  );

  const {
    data: ordersPage,
    isLoading,
    isError,
  } = useQuery<{ data: AdminOrder[]; total: number }>({
    queryKey: ["admin", "orders", "list", listFilters],
    queryFn: () => fetchAdminOrdersPage(listFilters),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const trendFilters = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search || undefined,
      timeRange: timeRange === "all" ? undefined : timeRange,
    }),
    [search, statusFilter, timeRange],
  );

  const { data: trendData } = useQuery({
    queryKey: ["admin", "orders", "trend", trendFilters],
    queryFn: () => fetchAdminOrdersTrend(trendFilters),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateOrderStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["bill"] });
      queryClient.invalidateQueries({ queryKey: ["bill", "order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "fonepay-audit", variables.id] });
      toast({ title: "Order status updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: getErrorMessage(error, "Please try updating the order again."),
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({
      id,
      paymentVerified,
    }: {
      id: string;
      paymentVerified: "verified" | "rejected";
    }) => verifyOrderPayment(id, paymentVerified),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["bill"] });
      queryClient.invalidateQueries({ queryKey: ["bill", "order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "fonepay-audit", variables.id] });
      toast({ title: "Payment verification updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update verification",
        description: getErrorMessage(error, "Please try updating the payment verification again."),
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: deleteAdminOrder,
    onSuccess: async (_data, orderId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin"] }),
        queryClient.invalidateQueries({ queryKey: ["bill"] }),
      ]);
      setSelectedOrder((prev) => (prev?.id === orderId ? null : prev));
      toast({ title: "Order deleted" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete order",
        description: getErrorMessage(error, "Please try deleting this order again."),
        variant: "destructive",
      });
    },
  });

  const orders = ordersPage?.data ?? [];
  const totalOrders = ordersPage?.total ?? 0;
  useEffect(() => {
    setOrderPage(1);
  }, [search, statusFilter, timeRange, orderPageSize]);

  const orderTotalPages = Math.max(1, Math.ceil(totalOrders / orderPageSize));
  const paginatedOrders = orders;
  const getOrderSerial = (idx: number) =>
    (orderPage - 1) * orderPageSize + idx + 1;

  const displayOrders = useMemo(() => {
    return paginatedOrders.filter((order) => {
      if (payTypeFilter && order.paymentMethod !== payTypeFilter) return false;
      if (payStatusFilter && (order.paymentVerified ?? "pending") !== payStatusFilter) return false;
      return true;
    });
  }, [paginatedOrders, payTypeFilter, payStatusFilter]);

  const trendSeries = (trendData as { series?: Array<{ total: number; completed: number; revenue: number }> } | undefined)?.series ?? [];
  const totalSparkline = trendSeries.map((d) => d.total);
  const completedSparkline = trendSeries.map((d) => d.completed);
  const revenueSparkline = trendSeries.map((d) => d.revenue);
  const computeTrend = (values: number[]) => {
    if (values.length < 2) return { pct: 0, up: true };
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    if (first === 0) return { pct: last > 0 ? 100 : 0, up: true };
    const pct = Math.round(((last - first) / first) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  };

  const orderTypeBadge = (order: AdminOrder) => {
    const isPos = order.source === "pos";
    return (
      <Badge
        variant="outline"
        className={
          isPos
            ? "bg-[#F5F3FF] text-[#6D28D9] border-[#6D28D9]/20"
            : "bg-[#EFF6FF] text-[#1D4ED8] border-[#1D4ED8]/20"
        }
      >
        {isPos ? "POS ORDER" : "ONLINE ORDER"}
      </Badge>
    );
  };

  const formatOrderStatusBadge = (status: string) => {
    const normalized = status?.toLowerCase?.() ?? status;
    const statusMap: Record<string, { label: string; bg: string; color: string }> = {
      pending:    { label: "Pending",    bg: "#fff7ed", color: "#c2410c" },
      processing: { label: "Processing", bg: "#eff6ff", color: "#1d4ed8" },
      completed:  { label: "Delivered",  bg: "#f0fdf4", color: "#15803d" },
      cancelled:  { label: "Cancelled",  bg: "#fef2f2", color: "#b91c1c" },
      pos:        { label: "POS",        bg: "#f5f3ff", color: "#6d28d9" },
      shipped:    { label: "Shipped",    bg: "#ecfeff", color: "#0e7490" },
      on_hold:    { label: "On Hold",    bg: "#fefce8", color: "#ca8a04" },
      returned:   { label: "Returned",   bg: "#fff1f2", color: "#be185d" },
      refunded:   { label: "Refunded",   bg: "#f5f5f4", color: "#57534e" },
    };
    const entry = statusMap[normalized] ?? { label: normalized, bg: "#F3F4F6", color: "#374151" };
    return (
      <span
        className="inline-flex items-center rounded-full px-[10px] py-[3px] text-[12px] font-medium"
        style={{ background: entry.bg, color: entry.color }}
      >
        {entry.label}
      </span>
    );
  };

  useEffect(() => {
    if (!selectedOrder) {
      setSelectedOrderItems([]);
      setSelectedOrderItemsLoading(false);
      return;
    }

    let cancelled = false;
    setSelectedOrderItemsLoading(true);
    setSelectedOrderItems([]);

    fetch(`/api/orders/${selectedOrder.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        setSelectedOrderItems(json?.data?.items ?? []);
        if (json?.data) {
          setSelectedOrder((prev) => (prev && prev.id === json.data.id ? { ...prev, ...json.data } : prev));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedOrderItems([]);
      })
      .finally(() => {
        if (cancelled) return;
        setSelectedOrderItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOrder?.id]);

  const orderItemsSubtotal = useMemo(() => {
    return selectedOrderItems.reduce((sum, it) => {
      const unit = Number(it.unitPrice) || 0;
      return sum + unit * (it.quantity || 0);
    }, 0);
  }, [selectedOrderItems]);

  const discountAmount = selectedOrder?.promoDiscountAmount ?? 0;

  const { data: posBill } = useQuery<AdminBill | null>({
    queryKey: ["bill", "order", selectedOrder?.id],
    enabled: !!selectedOrder && selectedOrder.source === "pos",
    queryFn: () => {
      if (!selectedOrder) return Promise.resolve(null);
      return fetchBillByOrder(selectedOrder.id);
    },
    staleTime: 0,
    retry: false,
  });

  const isFonepayOrder = selectedOrder?.paymentMethod === "fonepay";

  const {
    data: fonepayAudit,
    isLoading: fonepayAuditLoading,
  } = useQuery<AdminOrderFonepayAudit | null>({
    queryKey: ["admin", "orders", "fonepay-audit", selectedOrder?.id],
    enabled: Boolean(selectedOrder?.id && isFonepayOrder),
    queryFn: () => {
      if (!selectedOrder?.id) return Promise.resolve(null);
      return fetchAdminOrderFonepayAudit(selectedOrder.id);
    },
    staleTime: 30_000,
    retry: false,
  });

  const fonepayRuntime = fonepayAudit?.runtimeStatus ?? null;
  const fonepayIssues = useMemo(
    () =>
      Array.from(
        new Set([
          ...(fonepayRuntime?.web.issues ?? []),
          ...(fonepayRuntime?.qr.issues ?? []),
        ]),
      ),
    [fonepayRuntime],
  );
  const fonepayWarnings = useMemo(
    () =>
      Array.from(
        new Set([
          ...(fonepayRuntime?.web.warnings ?? []),
          ...(fonepayRuntime?.qr.warnings ?? []),
        ]),
      ),
    [fonepayRuntime],
  );

  const STATUS_TABS = ['All', 'Pending', 'Processing', 'Completed', 'Cancelled', 'POS'];
  const activeFilterLabel = statusFilter === "all"
    ? "All orders"
    : `${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)} orders`;
  const selectedOrderTrackingUrl = buildOrderTrackingUrl(selectedOrder?.trackingToken);
  const selectedOrderTotal = (selectedOrder?.total ?? 0) - (selectedOrder?.discountAmount ?? 0);
  const stats = useMemo(() => {
    const visibleOrders = orders;
    const completed = visibleOrders.filter((order) => order.status === "completed").length;
    const cancelled = visibleOrders.filter((order) => order.status === "cancelled").length;
    const pending = visibleOrders.filter((order) => order.status === "pending").length;
    const revenue = visibleOrders.reduce((sum, order) => sum + ((order.total ?? 0) - (order.discountAmount ?? 0)), 0);
    return [
      {
        label: "Total Orders",
        value: totalOrders.toLocaleString(),
        meta: `${visibleOrders.length.toLocaleString()} on this page`,
        tone: "default",
        icon: Package,
      },
      {
        label: "Completed",
        value: completed.toLocaleString(),
        meta: "Delivered / fulfilled",
        tone: "success",
        icon: CheckCircle2,
      },
      {
        label: "Pending",
        value: pending.toLocaleString(),
        meta: "Needs action",
        tone: "warning",
        icon: Clock,
      },
      {
        label: "Revenue",
        value: formatAdminNpr(revenue),
        meta: `${cancelled.toLocaleString()} cancelled`,
        tone: "neutral",
        icon: ShieldCheck,
      },
    ];
  }, [orders, totalOrders]);

  return (
    <div
      className="min-h-screen bg-[#F4F3EE] text-[#111827]"
      style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
    >
      <div className="mx-auto max-w-7xl px-6 pt-4">
        <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[#111827]">Orders</h1>
            <p className="text-[13px] text-[#6B7280]">
              {totalOrders.toLocaleString()} total • {activeFilterLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Section toggle — lives here in the header */}
            <div className="inline-flex rounded-lg bg-[#F3F4F6] p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  activeSection === "orders"
                    ? "border border-[#E5E7EB] bg-white text-[#111827]"
                    : "text-[#6B7280]",
                )}
                onClick={() => setActiveSection("orders")}
              >
                Orders
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                  activeSection === "chart"
                    ? "border border-[#E5E7EB] bg-white text-[#111827]"
                    : "text-[#6B7280]",
                )}
                onClick={() => setActiveSection("chart")}
              >
                Order Chart
              </button>
            </div>

            <Button
              onClick={() => setLocation("/admin/orders/new")}
              className="h-9 rounded-lg bg-[#111827] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black"
            >
              Create Order
            </Button>
            <ExportButton onExport={() => exportOrdersCSV()} />
          </div>
        </div>

        {activeSection === "orders" ? (
          <div className="space-y-6">
            <div className="mb-5 grid gap-3.5 lg:grid-cols-4">
              {[
                { label: "Total Orders", value: stats[0].value, icon: stats[0].icon, sparkline: totalSparkline },
                { label: "Delivered", value: stats[1].value, icon: stats[1].icon, sparkline: completedSparkline },
                { label: "Pending", value: stats[2].value, icon: stats[2].icon, sparkline: [] as number[] },
                { label: "Revenue", value: stats[3].value, icon: stats[3].icon, sparkline: revenueSparkline },
              ].map((card) => {
                const Icon = card.icon;
                const trend = computeTrend(card.sparkline);
                const sparkPts = generateSparklinePoints(card.sparkline);
                return (
                  <div key={card.label} className="relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-[18px]">
                    <div className="absolute right-[14px] top-[14px] flex h-8 w-8 items-center justify-center rounded-lg bg-[#F4F3EE]">
                      <Icon className="h-4 w-4 text-[#6B7280]" strokeWidth={1.8} />
                    </div>
                    <div className="mb-2 text-[12px] font-medium text-[#6B7280]">{card.label}</div>
                    <div className="mb-1.5 font-mono text-[26px] font-semibold leading-none text-[#1A1A2E]">{card.value}</div>
                    <div className={`flex items-center gap-1 text-[12px] font-medium ${trend.up ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                      {trend.pct > 0 ? (trend.up ? "▲" : "▼") : "—"} {trend.pct > 0 ? `${trend.pct}%` : "no change"}
                    </div>
                    {sparkPts ? (
                      <svg className="mt-1 h-9 w-full" viewBox="0 0 120 36" preserveAspectRatio="none">
                        <polyline
                          points={sparkPts}
                          fill="none"
                          stroke={trend.up ? "#10b981" : "#ef4444"}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <div className="mt-1 h-9" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
              <div className="border-b border-[#E5E7EB] px-4 py-3 sm:px-4">
                {/* Tab row */}
                <div className="mb-3 flex gap-0">
                  {STATUS_TABS.map((tab) => {
                    const isActive = tab === "All" ? statusFilter === "all" : statusFilter === tab.toLowerCase();
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab === "All" ? "all" : tab.toLowerCase())}
                        className={cn(
                          "cursor-pointer rounded-lg border px-4 py-[7px] text-[13px] font-medium transition-colors",
                          isActive
                            ? "border-[#E5E7EB] bg-[#F4F3EE] text-[#1A1A2E]"
                            : "border-transparent text-[#6B7280] hover:text-[#1A1A2E]",
                        )}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* Filter row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-[#D1D5DB] bg-white px-3 py-[7px]">
                    <Search className="h-3.5 w-3.5 flex-shrink-0 text-[#9CA3AF]" strokeWidth={2} />
                    <input
                      type="text"
                      placeholder="Search..."
                      data-testid="admin-orders-search"
                      className="w-full border-none bg-transparent text-[13px] text-[#1A1A2E] outline-none placeholder:text-[#9CA3AF]"
                      style={{ fontFamily: '"DM Sans", sans-serif' }}
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput ? (
                      <button
                        type="button"
                        onClick={() => { setSearchInput(""); setSearch(""); }}
                        className="text-[11px] text-[#9CA3AF] hover:text-[#6B7280]"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>

                  {/* Payment Type */}
                  <select
                    value={payTypeFilter}
                    onChange={(e) => setPayTypeFilter(e.target.value)}
                    className="cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 py-[7px] text-[13px] text-[#1A1A2E] outline-none"
                    style={{ fontFamily: '"DM Sans", sans-serif' }}
                  >
                    <option value="">Payment Type</option>
                    <option value="cash_on_delivery">COD</option>
                    <option value="fonepay">Fonepay / QR</option>
                  </select>

                  {/* Payment Status */}
                  <select
                    value={payStatusFilter}
                    onChange={(e) => setPayStatusFilter(e.target.value)}
                    className="cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-3 py-[7px] text-[13px] text-[#1A1A2E] outline-none"
                    style={{ fontFamily: '"DM Sans", sans-serif' }}
                  >
                    <option value="">Payment Status</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Date range */}
                  <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "all" | "1d" | "3d" | "7d")}>
                    <SelectTrigger className="h-auto min-h-0 gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3 py-[7px] text-[13px] text-[#1A1A2E] shadow-none focus:ring-0">
                      <Calendar className="h-3 w-3 text-[#6B7280]" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="1d">Last 1 day</SelectItem>
                      <SelectItem value="3d">Last 3 days</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="ml-auto">
                    <ExportButton onExport={() => exportOrdersCSV()} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table
                  className="orders-admin-table w-full border-collapse text-left"
                  style={{ minWidth: 1160 }}
                >
                  <colgroup>
                    <col style={{ width: 44 }} />
                    <col style={{ width: 56 }} />
                    <col style={{ width: 180 }} />
                    <col style={{ width: 72 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 116 }} />
                    <col style={{ width: 112 }} />
                    <col style={{ width: 116 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 124 }} />
                    <col style={{ width: 60 }} />
                  </colgroup>

                  <thead>
                    <tr style={{ background: "#F8F9FA", borderBottom: "2px solid #E5E7EB" }}>
                      <th className="px-3 py-3">
                        <input
                          type="checkbox"
                          style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#2563eb" }}
                          checked={displayOrders.length > 0 && displayOrders.every((o) => selectedOrderIds.has(o.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrderIds(new Set(displayOrders.map((o) => o.id)));
                            } else {
                              setSelectedOrderIds(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="cursor-pointer whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280] hover:text-[#1A1A2E]"># ↕</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Customer Name</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Qty</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Total Amount</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Payment Status</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Payment Mode</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Order Status</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Order Note</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Label</th>
                      <th className="whitespace-nowrap px-3 py-3 text-[12px] font-semibold text-[#6B7280]">Created Date</th>
                      <th className="whitespace-nowrap px-3 py-3 text-center text-[12px] font-semibold text-[#6B7280]">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="animate-pulse" style={{ borderBottom: "1px solid #E5E7EB" }}>
                          <td className="px-3 py-3"><div className="h-3.5 w-3.5 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-3 w-8 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="mb-1.5 h-3 w-28 rounded bg-[#E5E7EB]" /><div className="h-2.5 w-20 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-3 w-6 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-3 w-20 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-5 w-16 rounded-full bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-3 w-12 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-5 w-16 rounded-full bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-3 w-14 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="h-3 w-8 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="mb-1.5 h-3 w-20 rounded bg-[#E5E7EB]" /><div className="h-2.5 w-14 rounded bg-[#E5E7EB]" /></td>
                          <td className="px-3 py-3"><div className="mx-auto h-7 w-7 rounded-md bg-[#E5E7EB]" /></td>
                        </tr>
                      ))
                    ) : isError ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                          Failed to load orders. Please refresh and try again.
                        </td>
                      </tr>
                    ) : displayOrders.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                          No orders match the current filters.
                        </td>
                      </tr>
                    ) : (
                      displayOrders.map((order, idx) => {
                        const qty = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0;
                        const payMode =
                          order.paymentMethod === "cash_on_delivery"
                            ? "COD"
                            : order.paymentMethod === "fonepay"
                              ? "Fonepay"
                              : order.paymentMethod
                                ? order.paymentMethod.replace(/_/g, " ")
                                : "—";
                        const payVerified = order.paymentVerified ?? "pending";
                        const payBadge =
                          payVerified === "verified"
                            ? { bg: "#f0fdf4", color: "#15803d", label: "Verified" }
                            : payVerified === "rejected"
                              ? { bg: "#fef2f2", color: "#b91c1c", label: "Rejected" }
                              : { bg: "#fff7ed", color: "#c2410c", label: "Pending" };
                        const trackingUrl = buildOrderTrackingUrl(order.trackingToken);
                        const isSelected = selectedOrder?.id === order.id;

                        return (
                          <tr
                            key={order.id}
                            data-testid={`admin-order-row-${order.id}`}
                            className={cn("cursor-pointer transition-colors", isSelected ? "bg-[#eff6ff]" : "hover:bg-[#f9f9fb]")}
                            style={{ borderBottom: "1px solid #E5E7EB" }}
                            onClick={() => {
                              setSelectedOrder(order);
                              setSelectedOrderSn(getOrderSerial(idx));
                            }}
                          >
                            {/* Checkbox */}
                            <td className="px-3 py-3 align-middle">
                              <input
                                type="checkbox"
                                style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#2563eb" }}
                                checked={selectedOrderIds.has(order.id)}
                                onChange={(e) => {
                                  const next = new Set(selectedOrderIds);
                                  if (e.target.checked) next.add(order.id);
                                  else next.delete(order.id);
                                  setSelectedOrderIds(next);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>

                            {/* # */}
                            <td className="px-3 py-3 align-middle">
                              <span className="font-mono text-[12.5px] text-[#6B7280]">
                                {getOrderSerial(idx)}
                              </span>
                            </td>

                            {/* Customer Name */}
                            <td className="px-3 py-3 align-middle">
                              <div className="truncate text-[13.5px] font-medium text-[#1A1A2E]">
                                {displayEmptyField(order.fullName, "—")}
                              </div>
                              <div className="font-mono text-[11.5px] text-[#9CA3AF]">
                                {(order as AdminOrder & { phoneNumber?: string }).phoneNumber ?? "—"}
                              </div>
                            </td>

                            {/* Quantity */}
                            <td className="px-3 py-3 align-middle text-[13px] text-[#1A1A2E]">
                              {qty}
                            </td>

                            {/* Total Amount */}
                            <td className="px-3 py-3 align-middle font-mono text-[13px] font-medium text-[#1A1A2E]">
                              {formatAdminNpr((order.total ?? 0) - (order.discountAmount ?? 0))}
                            </td>

                            {/* Payment Status */}
                            <td className="px-3 py-3 align-middle">
                              <span
                                className="inline-flex items-center rounded-full px-[10px] py-[3px] text-[12px] font-medium"
                                style={{ background: payBadge.bg, color: payBadge.color }}
                              >
                                {payBadge.label}
                              </span>
                            </td>

                            {/* Payment Mode */}
                            <td className="px-3 py-3 align-middle text-[13px] text-[#1A1A2E]">
                              {payMode}
                            </td>

                            {/* Order Status */}
                            <td className="px-3 py-3 align-middle">
                              {formatOrderStatusBadge(order.status)}
                            </td>

                            {/* Order Note */}
                            <td className="px-3 py-3 align-middle">
                              <span className="block max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#6B7280]">
                                —
                              </span>
                            </td>

                            {/* Label */}
                            <td className="px-3 py-3 align-middle">
                              <span className="block max-w-[70px] overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#6B7280]">
                                —
                              </span>
                            </td>

                            {/* Created Date */}
                            <td className="px-3 py-3 align-middle">
                              {order.createdAt ? (
                                <>
                                  <div className="text-[12.5px] text-[#1A1A2E]">
                                    {format(new Date(order.createdAt), "d MMM yyyy")}
                                  </div>
                                  <div className="font-mono text-[11.5px] text-[#9CA3AF]">
                                    {format(new Date(order.createdAt), "hh:mm a")}
                                  </div>
                                </>
                              ) : (
                                <span className="text-[12px] text-[#6B7280]">—</span>
                              )}
                            </td>

                            {/* Action — three-dot dropdown */}
                            <td className="px-3 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="mx-auto flex h-7 w-7 items-center justify-center rounded-md border border-[#E5E7EB] bg-white transition-colors hover:border-[#D1D5DB] hover:bg-[#F4F3EE]"
                                  >
                                    <MoreVertical className="h-[13px] w-[13px] text-[#6B7280]" strokeWidth={2} />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-[13px]"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setSelectedOrderSn(getOrderSerial(idx));
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    View Order
                                  </DropdownMenuItem>
                                  {trackingUrl ? (
                                    <DropdownMenuItem
                                      className="cursor-pointer gap-2 text-[13px]"
                                      onClick={() => window.open(trackingUrl, "_blank", "noopener,noreferrer")}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      Track Order
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-[13px] text-[#b91c1c] focus:text-[#b91c1c]"
                                    onClick={() => setOrderToDelete(order)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete Order
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={orderPage}
                totalPages={orderTotalPages}
                onPageChange={(page) => {
                  setOrderPage(page);
                  setSelectedOrder(null);
                }}
                totalItems={totalOrders}
                pageSize={orderPageSize}
                onPageSizeChange={setOrderPageSize}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <OrdersTrendChart
              orders={orders}
              trendData={trendData}
              timeRange={timeRange as "1d" | "3d" | "7d" | "30d" | "all"}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(open) => {
          if (!open) setOrderToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-md border border-[#E5E7EB] bg-white p-0 shadow-xl">
          <div className="px-6 pt-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#FCA5A5] bg-[#FDECEC]">
              <AlertTriangle className="h-7 w-7 text-[#DC2626]" />
            </div>
          </div>
          <AlertDialogHeader className="px-6 pb-2 pt-4 text-center sm:text-center">
            <AlertDialogTitle className="text-2xl font-semibold text-[#111827]">Delete Order</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-center text-[14px] leading-6 text-[#6B7280]">
              <span className="block">
                You’re going to delete {orderToDelete ? `Order #${orderToDelete.id.slice(0, 8)}` : "this order"}.
              </span>
              <span className="block">This order will be permanently removed from admin order management. This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-3 px-6 pb-6 pt-3 sm:grid-cols-2 sm:space-x-0">
            <AlertDialogCancel
              onClick={() => setOrderToDelete(null)}
              className="mt-0 h-12 rounded-xl border-[#E5E7EB] bg-[#F9FAFB] text-[15px] font-semibold text-[#111827] hover:bg-[#F3F4F6]"
            >
              No, keep it.
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!orderToDelete) return;
                deleteOrderMutation.mutate(orderToDelete.id, {
                  onSuccess: () => setOrderToDelete(null),
                });
              }}
              className="h-12 rounded-xl bg-[#EF4444] text-[15px] font-semibold text-white hover:bg-[#DC2626]"
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Deleting order..." : "Yes, Delete!"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setSelectedOrderSn(null);
            setSelectedOrderItems([]);
          }
        }}
      >
        <SheetContent side="right" className="flex h-full w-full max-w-full flex-col overflow-hidden border-l border-[#E5E7EB] bg-[#FAFAFA] p-0 sm:w-[min(94vw,52rem)] sm:max-w-none">
          {selectedOrder ? (
            <>
              {/* ── Sticky header ── */}
              <div className="flex-shrink-0 border-b border-[#E5E7EB] bg-white px-5 py-4">
                <SheetHeader className="space-y-0">
                  <div className="flex flex-wrap items-center gap-2 pr-8">
                    <SheetTitle className="text-[15px] font-semibold text-[#111827]">
                      Order #{selectedOrderSn ?? "—"}
                    </SheetTitle>
                    {orderTypeBadge(selectedOrder)}
                    {formatOrderStatusBadge(selectedOrder.status)}
                  </div>
                  <SheetDescription className="mt-1 text-[12px] text-[#6B7280]">
                    {selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), "MMM d, yyyy • h:mm a") : "—"}
                    {selectedOrder.source === "pos" ? " · POS" : ""}
                  </SheetDescription>
                </SheetHeader>
              </div>

              {/* ── Scrollable body (single column) ── */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-3 px-5 py-4">

                  {/* ── 1. Order Status & Actions ── */}
                  <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Status &amp; Actions</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-[#6B7280]">Order status</p>
                        <Select
                          value={selectedOrder.status}
                          onValueChange={(val) => {
                            statusMutation.mutate({ id: selectedOrder.id, status: val });
                            setSelectedOrder((prev) => (prev ? { ...prev, status: val } : null));
                          }}
                        >
                          <SelectTrigger
                            data-testid="admin-order-status-select"
                            className="h-9 rounded-lg border-[#E5E7EB] bg-white text-[13px] text-[#111827]"
                          >
                            <SelectValue placeholder="Update status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                            <SelectItem value="returned">Returned</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                            <SelectItem value="pos">POS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-[#6B7280]">Payment verification</p>
                        <Select
                          value={selectedOrder.paymentVerified ?? "pending"}
                          onValueChange={(val) => {
                            if (val === "pending") return;
                            verifyMutation.mutate({
                              id: selectedOrder.id,
                              paymentVerified: val as "verified" | "rejected",
                            });
                            setSelectedOrder((prev) => (prev ? { ...prev, paymentVerified: val } : null));
                          }}
                        >
                          <SelectTrigger
                            data-testid="admin-order-verify-payment"
                            className="h-9 rounded-lg border-[#E5E7EB] bg-white text-[13px] text-[#111827]"
                          >
                            <SelectValue placeholder="Payment status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                      <div>
                        <p className="text-[12px] font-medium text-[#111827]">Mark as Delivered</p>
                        <p className="text-[11px] text-[#9CA3AF]">Switches status to completed</p>
                      </div>
                      <Switch
                        checked={selectedOrder.status === "completed"}
                        onCheckedChange={(checked) => {
                          const newStatus = checked ? "completed" : "processing";
                          statusMutation.mutate({ id: selectedOrder.id, status: newStatus });
                          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
                        }}
                      />
                    </div>
                  </section>

                  {/* ── 2. Tracking & Links ── */}
                  <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Tracking &amp; Links</p>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
                        <Link2 className="h-3.5 w-3.5 flex-none text-[#9CA3AF]" />
                        <span className="flex-1 truncate font-mono text-[11.5px] text-[#6B7280]">
                          {selectedOrderTrackingUrl ?? "No tracking URL — token not set"}
                        </span>
                        <button
                          type="button"
                          disabled={!selectedOrderTrackingUrl}
                          className="flex-none rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151] transition-colors hover:bg-[#F4F3EE] disabled:opacity-40"
                          onClick={() => {
                            if (!selectedOrderTrackingUrl) return;
                            navigator.clipboard.writeText(selectedOrderTrackingUrl);
                            toast({ title: "Tracking link copied" });
                          }}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          disabled={!selectedOrderTrackingUrl}
                          className="flex-none rounded-md border border-[#E5E7EB] bg-white p-1.5 text-[#374151] transition-colors hover:bg-[#F4F3EE] disabled:opacity-40"
                          onClick={() => {
                            if (!selectedOrderTrackingUrl) return;
                            window.open(selectedOrderTrackingUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {selectedOrder.paymentProofUrl ? (
                        <a
                          href={selectedOrder.paymentProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[12px] font-medium text-[#1D4ED8] transition-colors hover:bg-[#EFF6FF]"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View payment screenshot
                        </a>
                      ) : null}
                    </div>
                  </section>

                  {/* ── 3. Products ── */}
                  <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Products</p>
                    {selectedOrderItemsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex animate-pulse gap-3">
                            <div className="h-14 w-14 flex-none rounded-lg bg-[#F3F4F6]" />
                            <div className="flex-1 space-y-1.5 py-1">
                              <div className="h-3 w-3/4 rounded bg-[#F3F4F6]" />
                              <div className="h-2.5 w-1/2 rounded bg-[#F3F4F6]" />
                              <div className="h-2.5 w-1/3 rounded bg-[#F3F4F6]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : selectedOrderItems.length === 0 ? (
                      <p className="text-[13px] text-[#6B7280]">No items found.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedOrderItems.map((it) => {
                          const qty = Number(it.quantity) || 0;
                          const unit = Number(it.unitPrice) || 0;
                          const lineSubtotal = qty * unit;
                          const itemColor = resolveAdminOrderItemColor(it);
                          const colorMeta = itemColor ? parseAdminOrderColorMeta(itemColor) : null;
                          return (
                            <div key={it.id} className="flex gap-3 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] p-3">
                              {/* Product image placeholder */}
                              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-lg border border-[#E5E7EB] bg-white">
                                <Package className="h-6 w-6 text-[#D1D5DB]" />
                              </div>
                              {/* Details */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-medium text-[#111827]">
                                  {it.product?.name ?? "Unknown Product"}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {it.size ? (
                                    <span className="rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] font-medium text-[#6B7280]">
                                      {it.size}
                                    </span>
                                  ) : null}
                                  {colorMeta ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-[#F3F4F6] px-1.5 py-0.5 text-[11px] text-[#6B7280]">
                                      <span
                                        className="h-2.5 w-2.5 rounded-full border border-black/10"
                                        style={{ background: colorMeta.swatch ?? "#d4d4d8" }}
                                      />
                                      {colorMeta.label}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-[12px] text-[#9CA3AF]">
                                    {qty} × {formatPrice(unit)}
                                  </span>
                                  <span className="font-mono text-[13px] font-semibold text-[#111827]">
                                    {formatPrice(lineSubtotal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Price breakdown */}
                    <div className="mt-3 space-y-1.5 border-t border-[#E5E7EB] pt-3 text-[13px]">
                      <div className="flex items-center justify-between text-[#6B7280]">
                        <span>Subtotal</span>
                        <span className="font-mono">{formatAdminNpr(orderItemsSubtotal)}</span>
                      </div>
                      {(discountAmount ?? 0) > 0 ? (
                        <div className="flex items-center justify-between text-[#c2410c]">
                          <span>Discount</span>
                          <span className="font-mono">− {formatAdminNpr(discountAmount)}</span>
                        </div>
                      ) : null}
                      {(() => {
                        const deliveryCharge = selectedOrderTotal - orderItemsSubtotal + (discountAmount ?? 0);
                        return deliveryCharge > 0 ? (
                          <div className="flex items-center justify-between text-[#6B7280]">
                            <span>Delivery charge</span>
                            <span className="font-mono">{formatAdminNpr(deliveryCharge)}</span>
                          </div>
                        ) : null;
                      })()}
                      <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-1.5 text-[14px] font-semibold text-[#111827]">
                        <span>Total</span>
                        <span className="font-mono">{formatAdminNpr(selectedOrderTotal)}</span>
                      </div>
                    </div>
                  </section>

                  {/* ── 4. Customer Details ── */}
                  <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Customer</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9CA3AF]">Name</span>
                        <span className="text-[13px] font-medium text-[#111827]">
                          {displayEmptyField(selectedOrder.fullName, "N.A")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9CA3AF]">Email</span>
                        <span className="max-w-[200px] truncate text-right text-[13px] text-[#6B7280]">
                          {displayEmptyField(selectedOrder.email, "N.A")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[#9CA3AF]">Phone</span>
                        <span className="font-mono text-[13px] text-[#6B7280]">
                          {displayEmptyField(selectedOrder.phoneNumber, "N.A")}
                        </span>
                      </div>
                      {selectedOrder.source === "pos" && posBill?.processedBy ? (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#9CA3AF]">Processed by</span>
                          <span className="text-[13px] text-[#6B7280]">{posBill.processedBy}</span>
                        </div>
                      ) : null}
                    </div>
                  </section>

                  {/* ── 5. Delivery Details ── */}
                  <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Delivery Details</p>
                    <div className="space-y-2">
                      {[
                        {
                          label: "Address",
                          value: displayEmptyField(
                            selectedOrder.deliveryAddress ?? selectedOrder.addressLine1,
                            selectedOrder.source === "pos" ? "POS order" : "N.A",
                          ),
                        },
                        {
                          label: "Landmark",
                          value: displayEmptyField(selectedOrder.deliveryLocation, "N.A"),
                        },
                        { label: "City", value: displayEmptyField(selectedOrder.city, "N.A") },
                        { label: "Region", value: displayEmptyField(selectedOrder.region, "N.A") },
                        {
                          label: "Postal code",
                          value: displayEmptyField((selectedOrder as AdminOrder & { postalCode?: string }).postalCode, "N.A"),
                        },
                        {
                          label: "Country",
                          value: displayEmptyField(selectedOrder.country, selectedOrder.source === "pos" ? "Nepal" : "N.A"),
                        },
                        {
                          label: "Provider",
                          value: displayEmptyField(selectedOrder.deliveryProvider, "N.A"),
                        },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-3">
                          <span className="flex-none text-[11px] text-[#9CA3AF]">{label}</span>
                          <span className="text-right text-[13px] text-[#6B7280]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ── 6. Fonepay Gateway ── */}
                  {isFonepayOrder ? (
                    <section
                      className="rounded-xl border border-[#E5E7EB] bg-white p-4"
                      data-testid="admin-order-fonepay-audit"
                    >
                      <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">
                        <QrCode className="h-3.5 w-3.5" />
                        Fonepay Gateway
                      </div>

                      {fonepayAuditLoading ? (
                        <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading Fonepay details...
                        </div>
                      ) : fonepayRuntime ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                                fonepayRuntime.qr.available ? "border-[#B7DFC0] bg-[#E8F3EB] text-[#2C5234]" : "border-[#F3C0C0] bg-[#FDECEC] text-[#9A2D2D]",
                              )}
                            >
                              QR {fonepayRuntime.qr.available ? "ready" : "blocked"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                                fonepayRuntime.web.available ? "border-[#B7DFC0] bg-[#E8F3EB] text-[#2C5234]" : "border-[#F3C0C0] bg-[#FDECEC] text-[#9A2D2D]",
                              )}
                            >
                              Redirect {fonepayRuntime.web.available ? "ready" : "blocked"}
                            </Badge>
                            {fonepayAudit?.latestPrn ? (
                              <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2.5 py-1 text-[11px] font-medium text-[#111827]">
                                PRN {fonepayAudit.latestPrn.slice(-10)}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="space-y-2 text-[12px] text-[#6B7280]">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-[11px] text-[#9CA3AF]">Mode</span>
                              <span>
                                {fonepayRuntime.recommendedMode === "qr" ? "Dynamic QR" : fonepayRuntime.recommendedMode === "redirect" ? "Hosted redirect" : "Unavailable"}
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-3">
                              <span className="flex-none text-[11px] text-[#9CA3AF]">Callback URL</span>
                              <span className="break-all text-right">{fonepayRuntime.callbackUrl ?? "Not resolved"}</span>
                            </div>
                          </div>

                          {fonepayIssues.length > 0 ? (
                            <div className="rounded-lg border border-[#F3C0C0] bg-[#FDECEC] p-3">
                              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#9A2D2D]">
                                <AlertTriangle className="h-3.5 w-3.5" /> Issues
                              </div>
                              {fonepayIssues.map((issue) => (
                                <p key={issue} className="text-[12px] text-[#9A2D2D]">{issue}</p>
                              ))}
                            </div>
                          ) : null}

                          {fonepayWarnings.length > 0 ? (
                            <div className="rounded-lg border border-[#F1D7A9] bg-[#FFF4E5] p-3">
                              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#8C5A14]">
                                <ShieldCheck className="h-3.5 w-3.5" /> Warnings
                              </div>
                              {fonepayWarnings.map((warning) => (
                                <p key={warning} className="text-[12px] text-[#8C5A14]">{warning}</p>
                              ))}
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            {(fonepayAudit?.events.length ?? 0) === 0 ? (
                              <div className="rounded-lg border border-dashed border-[#E5E7EB] p-3 text-[12px] text-[#6B7280]">
                                No Fonepay audit events yet.
                              </div>
                            ) : (
                              fonepayAudit?.events.map((event, index) => (
                                <div
                                  key={event.id}
                                  data-testid={`admin-order-fonepay-event-${index}`}
                                  className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">
                                        {event.flow.toUpperCase()}
                                      </Badge>
                                      <span className="text-[12px] font-medium text-[#111827]">
                                        {formatFonepayStageLabel(event.stage)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]", getFonepayStatusBadgeClass(event.status))}
                                      >
                                        {event.status}
                                      </Badge>
                                    </div>
                                    <span className="text-[11px] text-[#9CA3AF]">
                                      {event.createdAt ? format(new Date(event.createdAt), "d MMM • h:mm a") : "—"}
                                    </span>
                                  </div>
                                  {event.message ? <p className="mt-1.5 text-[12px] text-[#6B7280]">{event.message}</p> : null}
                                  {event.prn || event.uid || event.bankCode ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {event.prn ? <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] text-[#6B7280]">PRN {event.prn.slice(-10)}</Badge> : null}
                                      {event.uid ? <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] text-[#6B7280]">UID {event.uid}</Badge> : null}
                                      {event.bankCode ? <Badge variant="outline" className="rounded-full border-[#E5E7EB] bg-white px-2 py-0.5 text-[10px] text-[#6B7280]">Bank {event.bankCode}</Badge> : null}
                                    </div>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[13px] text-[#6B7280]">No Fonepay readiness data available for this order yet.</p>
                      )}
                    </section>
                  ) : null}

                  {/* ── 7. Bill ── */}
                  {selectedOrder.status === "completed" ? (
                    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Bill</p>
                      <BillButton orderId={selectedOrder.id} />
                    </section>
                  ) : null}

                  {/* ── 8. Danger zone ── */}
                  <section className="rounded-xl border border-[#FDE8E8] bg-[#FFF9F9] p-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#F87171]">Danger Zone</p>
                    <p className="mb-3 text-[12px] text-[#6B7280]">
                      Permanently delete this order. This action cannot be undone.
                    </p>
                    <Button
                      type="button"
                      className="h-8 rounded-md border border-[#F7D4D4] bg-[#FFF6F6] px-3 text-[12px] font-medium text-[#9A2D2D] hover:bg-[#FDECEC] hover:text-[#9A2D2D]"
                      onClick={() => setOrderToDelete(selectedOrder)}
                      disabled={deleteOrderMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete order
                    </Button>
                  </section>

                  {/* bottom padding */}
                  <div className="h-4" />
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
