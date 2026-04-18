import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  MapPin,
  Package,
  Phone,
  QrCode,
  Receipt,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
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

  const orderTypeBadge = (order: AdminOrder) => {
    const isPos = order.source === "pos";
    return (
      <Badge
        variant="outline"
        className={
          isPos
            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900"
            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900"
        }
      >
        {isPos ? "POS ORDER" : "ONLINE ORDER"}
      </Badge>
    );
  };

  const formatOrderStatusBadge = (status: string) => {
    const normalized = status?.toLowerCase?.() ?? status;
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Pending",
        className:
          "bg-[#FFF4E5] text-[#8C5A14] border-[#8C5A14]/20 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-900",
      },
      processing: {
        label: "Processing",
        className:
          "bg-blue-100 text-blue-700 border-blue-700/20 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
      },
      completed: {
        label: "Completed",
        className:
          "bg-[#E8F3EB] text-[#2C5234] border-[#2C5234]/20 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
      },
      cancelled: {
        label: "Cancelled",
        className:
          "bg-[#FDECEC] text-[#9A2D2D] border-[#9A2D2D]/20 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
      },
      pos: {
        label: "POS",
        className:
          "bg-purple-100 text-purple-700 border-purple-700/20 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900",
      },
    };

    const entry = statusMap[normalized] ?? { label: normalized, className: "bg-muted text-[#111827]" };
    return <Badge variant="outline" className={entry.className}>{entry.label}</Badge>;
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

  return (
    <div className="min-h-screen bg-[#F4F3EE]">
      <div className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-[22px] font-medium text-[#111827]">
              Orders
            </h1>
            <p className="text-[13px] text-[#6B7280] mt-1">
              {totalOrders} orders • {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setLocation("/admin/orders/new")}
              className="h-9 bg-black text-white text-[13px] font-medium hover:bg-black/85"
            >
              Add Order
            </Button>
            <ExportButton onExport={() => exportOrdersCSV()} />
          </div>
        </div>

        <div className="inline-flex w-fit rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] p-1 mb-8">
          <button
            type="button"
            className={cn(
              "rounded-md px-4 py-2 text-[13px] font-medium transition-colors",
              activeSection === "orders" 
                ? "bg-white text-[#111827] border border-[#E5E7EB]" 
                : "text-[#6B7280] hover:text-[#111827]",
            )}
            onClick={() => setActiveSection("orders")}
          >
            Orders
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-4 py-2 text-[13px] font-medium transition-colors",
              activeSection === "chart" 
                ? "bg-white text-[#111827] border border-[#E5E7EB]" 
                : "text-[#6B7280] hover:text-[#111827]",
            )}
            onClick={() => setActiveSection("chart")}
          >
            Order Chart
          </button>
        </div>
      </div>

      {activeSection === "orders" ? (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab === 'All' ? 'all' : tab.toLowerCase())}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      (tab === 'All' ? statusFilter === 'all' : statusFilter === tab.toLowerCase())
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-[#6B7280] border-border hover:border-primary hover:text-[#111827]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-[#E5E7EB] rounded-lg px-2 py-1">
                <Clock className="h-3 w-3 text-[#6B7280]" />
                <Select
                  value={timeRange}
                  onValueChange={(v) => setTimeRange(v as "all" | "1d" | "3d" | "7d")}
                >
                  <SelectTrigger className="h-7 border-0 bg-transparent px-0 shadow-none focus:ring-0 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="1d">Last 1 day</SelectItem>
                    <SelectItem value="3d">Last 3 days</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
                <Input
                  placeholder="Search orders, customers..."
                  data-testid="admin-orders-search"
                  className="pl-9 bg-white border-[#E5E7EB] rounded-full h-11"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280] hover:text-[#111827]"
                  >
                    Clear
                  </button>
                )}
              </div>
              <ExportButton onExport={() => exportOrdersCSV()} />
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="orders-admin-table w-full min-w-[1060px] text-left text-sm">
                
                <thead className="bg-transparent border-b border-[#E5E7EB] text-[11px] uppercase text-[#6B7280] font-semibold tracking-[0.06em]">
                  <tr>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-center">S.N</th>
                    <th className="px-4 py-3 font-medium text-left">Customer</th>
                    <th className="px-4 py-3 font-medium text-left">Items</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-left">Date</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-left">Payment</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-center">Delivered</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-left">Paid</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-left">Status</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-center">Actions</th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {isLoading || isError
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 align-middle text-center"><div className="mx-auto h-3 w-7 bg-[#E5E7EB] animate-pulse rounded" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-3 w-28 bg-[#E5E7EB] animate-pulse rounded mb-2" /><div className="h-3 w-36 bg-[#E5E7EB] animate-pulse rounded" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-3 w-full max-w-[220px] bg-[#E5E7EB] animate-pulse rounded" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-3 w-24 bg-[#E5E7EB] animate-pulse rounded mb-2" /><div className="h-3 w-16 bg-[#E5E7EB] animate-pulse rounded" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-3 w-20 bg-[#E5E7EB] animate-pulse rounded" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-6 w-10 rounded-full bg-[#E5E7EB] animate-pulse mx-auto" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-6 w-14 rounded-full bg-[#E5E7EB] animate-pulse" /></td>
                          <td className="px-4 py-3 align-middle"><div className="h-6 w-16 rounded-full bg-[#E5E7EB] animate-pulse" /></td>
                          <td className="px-4 py-3 align-middle text-center"><div className="h-7 w-20 bg-[#E5E7EB] animate-pulse rounded mx-auto" /></td>
                          <td className="px-4 py-3 align-middle text-right"><div className="h-3 w-16 bg-[#E5E7EB] animate-pulse rounded ml-auto" /></td>
                        </tr>
                      ))
                    : paginatedOrders.map((order, idx) => {
                    const statusMap: Record<string, string> = {
                      pending: 'Pending',
                      processing: 'Processing',
                      completed: 'Completed',
                      cancelled: 'Cancelled',
                      pos: 'POS',
                    };
                    const status = statusMap[order.status] ?? order.status;
                    const itemSummary =
                      order.items
                        ?.map((item) => {
                          const itemColor = resolveAdminOrderItemColor(item);
                          const variantLabel = [item.size?.trim(), itemColor].filter(Boolean).join(" · ");
                          return `${item.name}${variantLabel ? ` (${variantLabel})` : ""} × ${item.quantity}`;
                        })
                        .join(", ") || "—";
                    return (
                      <tr
                        key={order.id}
                        data-testid={`admin-order-row-${order.id}`}
                        className={cn(
                          "transition-all duration-200 cursor-pointer",
                          selectedOrder?.id === order.id
                            ? "bg-[#2C5234]/5 border-l-2 border-[#2C5234]"
                            : "hover:bg-[#F9FAFB]",
                        )}
                        onClick={() => {
                          setSelectedOrder(order);
                          setSelectedOrderSn(getOrderSerial(idx));
                        }}
                      >
                        <td className={cn(
                          "px-4 py-3 align-middle text-center font-medium text-xs whitespace-nowrap",
                          selectedOrder?.id === order.id && "border-l-[2px] border-[#2C5234]"
                        )}>{getOrderSerial(idx)}</td>
                        <td className="px-4 py-3 align-middle min-w-0">
                          <div className="font-medium text-[#111827] truncate text-[13px]" title={order.fullName}>{order.fullName}</div>
                          <div className="text-[#6B7280] text-[12px] truncate" title={order.email ?? undefined}>{displayEmptyField(order.email, "N.A")}</div>
                          {order.country && (
                            <div className="text-[#6B7280] text-[12px] mt-1 truncate" title={order.country}>{displayEmptyField(order.country, "N.A")}</div>
                          )}
                          <div className="mt-1.5 space-y-0.5 md:hidden">
                            <div className="text-[12px] text-[#6B7280] truncate" title={itemSummary}>{itemSummary}</div>
                            <div className="hidden sm:block text-[11px] text-[#6B7280]">
                              {order.createdAt ? `${format(new Date(order.createdAt), "MMM d, yyyy")} · ${format(new Date(order.createdAt), "h:mm a")}` : "—"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle min-w-0">
                          <div className="text-[12px] text-[#6B7280] truncate max-w-[220px]" title={itemSummary}>{itemSummary}</div>
                        </td>
                        <td className="px-4 py-3 align-middle text-[#6B7280] whitespace-nowrap">
                          {order.createdAt ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-[#111827] text-[12px]">{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                              <span className="text-[11px] text-[#6B7280]">{format(new Date(order.createdAt), "h:mm a")}</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col gap-1 text-[12px]">
                            <span className="font-medium capitalize truncate text-[#111827]" title={order.paymentMethod?.replace(/_/g, " ") ?? "—"}>
                              {order.paymentMethod?.replace(/_/g, " ") ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={order.status === "completed"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  statusMutation.mutate({ id: order.id, status: "completed" });
                                } else {
                                  statusMutation.mutate({ id: order.id, status: "processing" });
                                }
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          {order.paymentVerified === "verified" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Paid</Badge>
                          ) : order.paymentVerified === "rejected" ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">Rejected</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Unpaid</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Badge
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              status === "Completed" ? "bg-[#E8F3EB] text-[#2C5234] border-[#2C5234]/20 dark:bg-green-950 dark:text-green-300 dark:border-green-900" :
                              status === "Pending" ? "bg-[#FFF4E5] text-[#8C5A14] border-[#8C5A14]/20 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900" :
                              status === "Processing" ? "bg-blue-100 text-blue-700 border-blue-700/20 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900" :
                              status === "POS" ? "bg-purple-100 text-purple-700 border-purple-700/20 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900" :
                              "bg-[#FDECEC] text-[#9A2D2D] border-[#9A2D2D]/20 dark:bg-red-950 dark:text-red-300 dark:border-red-900"
                            )}
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <div className="flex items-center justify-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                            <BillButton orderId={order.id} />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOrderToDelete(order);
                              }}
                              disabled={deleteOrderMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-right font-semibold text-[#111827] whitespace-nowrap text-[13px]">
                          {formatAdminNpr((order.total ?? 0) - (order.discountAmount ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
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
        </>
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
          <OrdersTrendChart
            orders={orders}
            trendData={trendData}
            timeRange={timeRange as "1d" | "3d" | "7d" | "30d" | "all"}
          />
        </div>
      )}

      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent className="max-w-md rounded-[28px] border border-[#D8E4D8] bg-white/95 p-0 shadow-[0_28px_80px_rgba(21,33,24,0.22)] backdrop-blur-xl dark:border-[#2F3D33] dark:bg-[#101712]/95">
          <div className="px-6 py-6">
            <AlertDialogHeader className="space-y-2 text-left">
              <AlertDialogTitle className="text-xl font-black tracking-tight text-[#142017] dark:text-[#F3FAF4]">
                Delete this order?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6 text-[#4B5A4E] dark:text-[#C7D6C9]">
                {orderToDelete
                  ? `Order #${orderToDelete.id.slice(0, 8)} will be permanently removed. This action cannot be undone.`
                  : "This order will be permanently removed. This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <AlertDialogFooter className="gap-2 px-6 py-5 sm:justify-end">
            <AlertDialogCancel className="mt-0 rounded-full border-[#D0DCCF] px-5 dark:border-[#324134] dark:bg-[#141D16] dark:text-[#E3F1E5] dark:hover:bg-[#1C2820]" disabled={deleteOrderMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="mt-0 rounded-full bg-[#B42318] px-5 text-white hover:bg-[#932018] dark:bg-[#C9372C] dark:hover:bg-[#A52E24]"
              onClick={(event) => {
                event.preventDefault();
                if (!orderToDelete) return;
                deleteOrderMutation.mutate(orderToDelete.id, {
                  onSuccess: () => setOrderToDelete(null),
                });
              }}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending ? "Deleting..." : "Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

  {/* Sliding Drawer for Order Details */}
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
        <SheetContent side="right" className="flex h-full w-full max-w-full flex-col overflow-y-auto border-l border-[#E5E7EB] bg-[#F4F3EE] p-0 sm:w-[min(92vw,58rem)] sm:max-w-none xl:w-[min(50vw,72rem)]">
          {selectedOrder && (
            <>
              <div className="sticky top-0 z-10 flex-none space-y-4 border-b border-[#E5E7EB] bg-[#F4F3EE]/95 p-6 backdrop-blur supports-[backdrop-filter]:bg-[#F4F3EE]/88">
                <SheetHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest bg-muted">
                        S.N {selectedOrderSn ?? "—"}
                      </Badge>
                      {orderTypeBadge(selectedOrder)}
                      {formatOrderStatusBadge(selectedOrder.status)}
                    </div>
                    <span className="text-xs font-medium text-[#6B7280] whitespace-nowrap">
                      {format(new Date(selectedOrder.createdAt), "MMM d, yyyy • h:mm a")}
                    </span>
                  </div>
                  <SheetTitle className="text-[16px] font-medium text-[#111827] pt-2">
                    Order #{selectedOrder.id.slice(0, 8)}
                  </SheetTitle>
                  <div className="space-y-1">
                    <SheetDescription className="text-[13px] text-[#111827] font-medium">
                      {selectedOrder.fullName}
                    </SheetDescription>
                    <SheetDescription className="text-[12px] text-[#6B7280]">
                      {displayEmptyField(selectedOrder.email)}
                    </SheetDescription>
                    <div className="text-[12px] text-[#6B7280] flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Customer Phone: {displayEmptyField(selectedOrder.phoneNumber)}</span>
                    </div>
                  </div>
                </SheetHeader>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(val) => {
                      statusMutation.mutate({
                        id: selectedOrder.id,
                        status: val,
                      });
                      setSelectedOrder(prev => prev ? { ...prev, status: val } : null);
                    }}
                  >
                    <SelectTrigger data-testid="admin-order-status-select" className={cn(
                        "h-10 text-xs font-bold uppercase tracking-wider rounded-md",
                        selectedOrder.status === "completed" ? "bg-[#E8F3EB] text-[#2C5234] border-[#2C5234]/20 dark:bg-green-950 dark:text-green-300 dark:border-green-900" :
                        selectedOrder.status === "pending" ? "bg-[#FFF4E5] text-[#8C5A14] border-[#8C5A14]/20 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900" :
                        selectedOrder.status === "processing" ? "bg-blue-100 text-blue-700 border-blue-700/20 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900" :
                        selectedOrder.status === "pos" ? "bg-purple-100 text-purple-700 border-purple-700/20 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900" :
                        "bg-[#FDECEC] text-[#9A2D2D] border-[#9A2D2D]/20 dark:bg-red-950 dark:text-red-300 dark:border-red-900"
                      )}>
                      <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                      <SelectItem value="processing">🔵 Processing</SelectItem>
                      <SelectItem value="completed">✅ Completed</SelectItem>
                      <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                      <SelectItem value="pos">🟣 POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Quick toggles for delivered/paid */}
                <div className="flex items-center gap-6 p-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-xs font-medium text-[#111827]">Delivered</span>
                    <Switch
                      checked={selectedOrder.status === "completed"}
                      onCheckedChange={(checked) => {
                        const newStatus = checked ? "completed" : "processing";
                        statusMutation.mutate({ id: selectedOrder.id, status: newStatus });
                        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-[#6B7280]" />
                    <span className="text-xs font-medium text-[#111827]">Paid</span>
                    <Switch
                      checked={selectedOrder.paymentVerified === "verified"}
                      onCheckedChange={(checked) => {
                        const val = checked ? "verified" : "rejected";
                        verifyMutation.mutate({ id: selectedOrder.id, paymentVerified: val as "verified" | "rejected" });
                        setSelectedOrder(prev => prev ? { ...prev, paymentVerified: val } : null);
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[#E5E7EB] bg-white p-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                    <Link2 className="h-3.5 w-3.5" /> Tracking URL
                  </div>
                  <div className="mt-2 rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-[#111827] break-all">
                    {buildOrderTrackingUrl(selectedOrder.trackingToken) ?? "Preparing tracking link..."}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] uppercase tracking-wider"
                      onClick={() => {
                        const url = buildOrderTrackingUrl(selectedOrder.trackingToken);
                        if (!url) return;
                        navigator.clipboard.writeText(url);
                        toast({ title: "Tracking link copied" });
                      }}
                      disabled={!selectedOrder.trackingToken}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px] uppercase tracking-wider"
                      onClick={() => {
                        const url = buildOrderTrackingUrl(selectedOrder.trackingToken);
                        if (!url) return;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                      disabled={!selectedOrder.trackingToken}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid flex-1 auto-rows-max gap-6 p-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                {/* Items Ordered */}
                <div className="space-y-3 xl:col-span-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
                    Items Ordered
                  </h4>
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                    {selectedOrderItemsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-12 bg-[#E5E7EB] rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : selectedOrderItems.length === 0 ? (
                      <p className="text-sm text-[#6B7280]">No items found.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedOrderItems.map((it) => {
                          const qty = Number(it.quantity) || 0;
                          const unit = Number(it.unitPrice) || 0;
                          const lineSubtotal = qty * unit;
                          const itemColor = resolveAdminOrderItemColor(it);
                          const colorMeta = itemColor ? parseAdminOrderColorMeta(itemColor) : null;
                          return (
                            <div
                              key={it.id}
                              className="flex items-start justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-[#111827]">{it.product?.name ?? "Unknown Product"}</span>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {it.size && (
                                      <span className="text-xs bg-[#F9FAFB] px-1.5 py-0.5 rounded text-[#6B7280] font-medium border border-[#E5E7EB]">
                                        Size: {it.size}
                                      </span>
                                    )}
                                    {colorMeta && (
                                      <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-xs text-[#6B7280]">
                                        <span
                                          className="h-3 w-3 rounded-full border border-black/10"
                                          style={{ background: colorMeta.swatch ?? "#d4d4d8" }}
                                        />
                                        {colorMeta.label}
                                      </span>
                                    )}
                                    <span className="text-xs text-[#6B7280]">
                                      Qty: {qty}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-[#6B7280] mt-2">
                                  Unit: {formatPrice(unit)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-[#111827]">{formatPrice(lineSubtotal)}</p>
                                <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mt-1">
                                  Subtotal
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#111827] flex items-center gap-2">
                    <Receipt className="w-4 h-4" /> Payment Details
                  </h4>
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#6B7280]">Method</span>
                      <span className="font-medium capitalize text-[#111827]">{selectedOrder.paymentMethod?.replace(/_/g, " ") ?? "—"}</span>
                    </div>
                    <div className="pt-2 border-t border-dashed border-[#E5E7EB] space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6B7280]">Subtotal</span>
                        <span className="text-[#111827] font-medium">{formatPrice(selectedOrder.total ?? 0)}</span>
                      </div>

                      {(selectedOrder.discountAmount ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[#6B7280]">Discount</span>
                          <span className="text-[#2C5234] font-medium">
                            - {formatPrice(selectedOrder.discountAmount ?? 0)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-1 text-[#111827]">
                        <span>Total Paid</span>
                        <span>{formatPrice((selectedOrder.total ?? 0) - (selectedOrder.discountAmount ?? 0))}</span>
                      </div>
                    </div>

                    {selectedOrder.paymentProofUrl && (
                      <div className="pt-3 border-t border-[#E5E7EB]">
                        <div className="flex items-center justify-between mb-2">
                          <a
                            href={selectedOrder.paymentProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[#1D4ED8] hover:text-[#1D4ED8]/80 transition-colors"
                          >
                            View screenshot
                          </a>
                          {selectedOrder.paymentVerified == null ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                data-testid="admin-order-verify-payment"
                                className="h-7 text-[10px] font-bold tracking-wider"
                                onClick={() => {
                                  verifyMutation.mutate({ id: selectedOrder.id, paymentVerified: "verified" });
                                  setSelectedOrder(prev => prev ? { ...prev, paymentVerified: "verified" } : null);
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Verify
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={
                                selectedOrder.paymentVerified === "verified"
                                  ? "bg-[#E8F3EB] text-[#2C5234] text-[10px]"
                                  : "bg-[#FDECEC] text-[#9A2D2D] text-[10px]"
                              }
                            >
                              {selectedOrder.paymentVerified}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery & Shipping Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#111827] flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Delivery Information
                  </h4>
                  <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
                    
                    <div className="mb-4 pb-4 border-b border-border/50 grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider mb-1">Source</p>
                         <p className="text-sm font-medium capitalize flex items-center gap-1.5">
                           {selectedOrder.source === 'instagram' ? <Globe className="w-3 h-3 text-pink-600"/> :
                            selectedOrder.source === 'tiktok' ? <Globe className="w-3 h-3"/> :
                            selectedOrder.source === 'pos' ? <Package className="w-3 h-3 text-purple-600"/> :
                            <Globe className="w-3 h-3 text-blue-600"/> }
                           {selectedOrder.source || 'Website'}
                         </p>
                      </div>
                      <div>
                         <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider mb-1">Provider</p>
                         {selectedOrder.deliveryRequired === false ? (
                           <Badge variant="outline" className="text-[10px]">No Delivery</Badge>
                         ) : (
                           <p className="text-sm font-medium capitalize text-[#2C3E2D] dark:text-[#111827]">
                             {selectedOrder.deliveryProvider ? selectedOrder.deliveryProvider.replace(/_/g, " ") : 'Not Assigned'}
                           </p>
                         )}
                      </div>
                    </div>

                    {selectedOrder.source === "pos" ? (
                      <div className="space-y-3 mt-3">
                        <div>
                          <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider mb-1">
                            Staff Created
                          </p>
                          <p className="text-sm font-medium text-[#111827]">
                            {posBill?.processedBy ?? "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          POS order (no delivery address)
                        </Badge>
                      </div>
                    ) : selectedOrder.deliveryRequired !== false && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider mb-1">
                            Delivery Location
                          </p>
                          <p className="text-sm font-medium text-[#111827]">
                            {displayEmptyField(selectedOrder.deliveryLocation, "N.A")}
                          </p>
                        </div>
                        {selectedOrder.deliveryAddress ? (
                          <div>
                            <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider mb-1">Custom Delivery Address</p>
                            <p className="text-sm font-medium text-[#111827]">{displayEmptyField(selectedOrder.deliveryAddress)}</p>
                          </div>
                        ) : selectedOrder.addressLine1 ? (
                          <div>
                            <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-wider mb-1">Delivery Address</p>
                            <div className="text-sm font-medium text-[#111827] leading-relaxed">
                              {displayEmptyField(selectedOrder.addressLine1)}, {displayEmptyField(selectedOrder.city)}
                              {selectedOrder.region && `, ${displayEmptyField(selectedOrder.region)}`}
                              {selectedOrder.postalCode && ` ${displayEmptyField(selectedOrder.postalCode)}`}
                              {selectedOrder.country ? `, ${displayEmptyField(selectedOrder.country)}` : ""}
                              <div className="text-[#6B7280] mt-1 text-xs">
                                Customer Phone: {displayEmptyField(selectedOrder.phoneNumber)}
                              </div>
                            </div>
                            
                            {selectedOrder.locationCoordinates && (
                              <div className="mt-3">
                                <a
                                  href={`https://www.google.com/maps?q=${selectedOrder.locationCoordinates}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                >
                                  <MapPin className="w-3 h-3" /> View Map Location
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-[#6B7280] italic">No address provided.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isFonepayOrder && (
                  <div
                    className="space-y-3 xl:col-span-2"
                    data-testid="admin-order-fonepay-audit"
                  >
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#111827]">
                      <QrCode className="h-4 w-4" /> Fonepay Audit
                    </h4>
                    <div className="grid gap-4 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
                      <div className="rounded-xl border border-[#E5E5E0] bg-white/85 p-4 dark:bg-muted/30">
                        {fonepayAuditLoading ? (
                          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading Fonepay readiness...
                          </div>
                        ) : fonepayRuntime ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] uppercase tracking-wider",
                                  fonepayRuntime.web.available
                                    ? "bg-[#E8F3EB] text-[#2C5234]"
                                    : "bg-[#FDECEC] text-[#9A2D2D]",
                                )}
                              >
                                Redirect {fonepayRuntime.web.available ? "ready" : "blocked"}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] uppercase tracking-wider",
                                  fonepayRuntime.qr.available
                                    ? "bg-[#E8F3EB] text-[#2C5234]"
                                    : "bg-[#FDECEC] text-[#9A2D2D]",
                                )}
                              >
                                Dynamic QR {fonepayRuntime.qr.available ? "ready" : "blocked"}
                              </Badge>
                              {fonepayAudit?.latestPrn ? (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                  PRN {fonepayAudit.latestPrn.slice(-10)}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="space-y-2 text-sm">
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                                  Recommended Mode
                                </div>
                                <div className="mt-1 font-medium capitalize">
                                  {fonepayRuntime.recommendedMode === "qr"
                                    ? "Dynamic QR"
                                    : fonepayRuntime.recommendedMode === "redirect"
                                      ? "Hosted redirect"
                                      : "Unavailable"}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                                  Callback URL
                                </div>
                                <div className="mt-1 break-all text-xs text-[#111827]">
                                  {fonepayRuntime.callbackUrl ?? "Not resolved"}
                                </div>
                                <div className="mt-1 text-[11px] text-[#6B7280]">
                                  Source: {fonepayRuntime.callbackUrlSource === "env" ? "Environment" : "Derived per request"}
                                </div>
                              </div>
                              <div className="rounded-lg border border-[#E5E5E0] bg-muted/30 p-3 text-xs text-[#6B7280]">
                                Bank selection and credentials stay on the hosted Fonepay side. Rare Atelier only stores the order, gateway readiness, and verification trail.
                              </div>
                            </div>

                            {fonepayIssues.length > 0 ? (
                              <div className="rounded-lg border border-[#F7D4D4] bg-[#FFF6F6] p-3 dark:border-red-900 dark:bg-red-950/30">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A2D2D] dark:text-red-300">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Gateway issues
                                </div>
                                <div className="mt-2 space-y-2 text-xs text-[#7A2424] dark:text-red-200">
                                  {fonepayIssues.map((issue) => (
                                    <p key={issue}>{issue}</p>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {fonepayWarnings.length > 0 ? (
                              <div className="rounded-lg border border-[#F1E3B7] bg-[#FFF9E6] p-3 dark:border-yellow-900 dark:bg-yellow-950/30">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8C5A14] dark:text-yellow-200">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  Warnings
                                </div>
                                <div className="mt-2 space-y-2 text-xs text-[#7A5710] dark:text-yellow-100">
                                  {fonepayWarnings.map((warning) => (
                                    <p key={warning}>{warning}</p>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-[#6B7280]">
                            No Fonepay readiness data available for this order yet.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-[#E5E5E0] bg-white/85 p-4 dark:bg-muted/30">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                              Event Timeline
                            </div>
                            <p className="mt-1 text-sm text-[#6B7280]">
                              Initiation, callback, and QR verification events stay attached to this order for support and sandbox debugging.
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                            {fonepayAudit?.events.length ?? 0} events
                          </Badge>
                        </div>

                        <div className="mt-4 space-y-3">
                          {fonepayAuditLoading ? (
                            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading event history...
                            </div>
                          ) : (fonepayAudit?.events.length ?? 0) === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-[#6B7280]">
                              No Fonepay audit events yet. The next redirect or QR action will appear here automatically.
                            </div>
                          ) : (
                            fonepayAudit?.events.map((event, index) => (
                              <div
                                key={event.id}
                                data-testid={`admin-order-fonepay-event-${index}`}
                                className="rounded-xl border border-border/60 bg-white/90 p-4 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.45)]/70"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                        {event.flow.toUpperCase()}
                                      </Badge>
                                      <span className="text-sm font-semibold text-[#111827]">
                                        {formatFonepayStageLabel(event.stage)}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] uppercase tracking-wider",
                                          getFonepayStatusBadgeClass(event.status),
                                        )}
                                      >
                                        {event.status}
                                      </Badge>
                                    </div>
                                    {event.message ? (
                                      <p className="text-sm text-[#6B7280]">{event.message}</p>
                                    ) : null}
                                  </div>
                                  <span className="text-xs font-medium text-[#6B7280] whitespace-nowrap">
                                    {event.createdAt
                                      ? format(new Date(event.createdAt), "MMM d, yyyy • h:mm a")
                                      : "—"}
                                  </span>
                                </div>

                                {(event.prn || event.uid || event.bankCode) ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {event.prn ? (
                                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                        PRN {event.prn.slice(-10)}
                                      </Badge>
                                    ) : null}
                                    {event.uid ? (
                                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                        UID {event.uid}
                                      </Badge>
                                    ) : null}
                                    {event.bankCode ? (
                                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                        Bank {event.bankCode}
                                      </Badge>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Actions */}
                {selectedOrder.status === "completed" && (
                  <div className="border-t border-border pt-4 xl:col-span-2">
                    <BillButton orderId={selectedOrder.id} />
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
