import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { useThemeStore } from "@/store/theme";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { GenerateCustomLinkUI } from "@/components/admin/GenerateCustomLinkUI";
import {
  createAdminOrder,
  fetchAdminOrdersPage,
  fetchAdminProductsPage,
  type AdminCreateOrderInput,
  type AdminOrder,
} from "@/lib/adminApi";
import type { ProductApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type ProductStockStatus = "active" | "low" | "out";
type PaymentStatusUi = "Paid" | "Pending" | "Partial" | "Cancelled";
type EditableField = "customer_name" | "phone" | "payment_status";

type CreateOrderListProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_status: ProductStockStatus;
  image_url: string | null;
  searchText: string;
};

type CartItem = {
  productId: string;
  name: string;
  category: string;
  priceAtTime: number;
  quantity: number;
  stock_status: ProductStockStatus;
  image_url: string | null;
};

type RecentOrderRow = {
  id: string;
  display_id: string;
  customer_name: string;
  phone: string;
  products_summary: string;
  total: number;
  payment_status: PaymentStatusUi;
};

type EditableCell = {
  rowId: string;
  field: EditableField;
  value: string;
};

type CustomerFormState = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  landmark: string;
};

type PaymentFormState = {
  method: "Cash on delivery" | "Online transfer" | "Esewa-Khalti" | "Card";
  status: PaymentStatusUi;
  deliveryCharge: number;
  discount: number;
};

type CreatedModalState = {
  open: boolean;
  orderLabel: string;
  total: number;
  trackingToken: string | null;
};

type RequiredFieldErrors = {
  fullName?: string;
  phone?: string;
};

const CARD_CLASS = "rounded-xl border border-black/8 bg-white dark:border-border dark:bg-card";
const INPUT_CLASS =
  "h-10 rounded-lg border border-black/10 bg-[#f6f5f1] px-3 text-[13px] text-[#1f1e1a] shadow-none transition-colors placeholder:text-[#6B7280] focus-visible:ring-0 focus-visible:border-black/25 dark:border-border dark:bg-muted dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:border-ring";

const PAYMENT_METHOD_MAP: Record<PaymentFormState["method"], AdminCreateOrderInput["paymentMethod"]> = {
  "Cash on delivery": "cash_on_delivery",
  "Online transfer": "bank_transfer",
  "Esewa-Khalti": "esewa",
  Card: "stripe",
};

const UI_TO_BACKEND_STATUS: Record<PaymentStatusUi, NonNullable<AdminCreateOrderInput["status"]>> = {
  Paid: "completed",
  Pending: "pending",
  Partial: "processing",
  Cancelled: "cancelled",
};

const BACKEND_TO_UI_STATUS: Record<string, PaymentStatusUi> = {
  completed: "Paid",
  pending: "Pending",
  processing: "Partial",
  cancelled: "Cancelled",
};

const NEPAL_PHONE_COUNTRY_CODE = "+977";
const NEPAL_PHONE_LOCAL_LENGTH = 10;

const THUMBNAIL_PALETTE = [
  { bg: "#E6F1FB", text: "#185FA5" },
  { bg: "#EAF3DE", text: "#3B6D11" },
  { bg: "#FAEEDA", text: "#854F0B" },
  { bg: "#EEEDFE", text: "#534AB7" },
  { bg: "#FAECE7", text: "#993C1D" },
  { bg: "#E1F5EE", text: "#0F6E56" },
  { bg: "#FBEAF0", text: "#993556" },
  { bg: "#FCEBEB", text: "#A32D2D" },
] as const;

const RECENT_ORDER_FALLBACKS: RecentOrderRow[] = [
  {
    id: "fallback-1041",
    display_id: "#1041",
    customer_name: "Sita Thapa",
    phone: "9841000001",
    products_summary: "Henley Tee x1",
    total: 3300,
    payment_status: "Paid",
  },
  {
    id: "fallback-1040",
    display_id: "#1040",
    customer_name: "Ram Shrestha",
    phone: "9841000002",
    products_summary: "Cargo Pants x2",
    total: 9100,
    payment_status: "Pending",
  },
  {
    id: "fallback-1039",
    display_id: "#1039",
    customer_name: "Anita KC",
    phone: "9841000003",
    products_summary: "Laptop Pro x1",
    total: 68100,
    payment_status: "Paid",
  },
  {
    id: "fallback-1038",
    display_id: "#1038",
    customer_name: "Bikash Rai",
    phone: "9841000004",
    products_summary: "Black Set, Crewneck",
    total: 6500,
    payment_status: "Partial",
  },
  {
    id: "fallback-1037",
    display_id: "#1037",
    customer_name: "Priya Gurung",
    phone: "9841000005",
    products_summary: "Mini Tote x2",
    total: 3700,
    payment_status: "Pending",
  },
];

const DEFAULT_CUSTOMER_FORM: CustomerFormState = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  landmark: "",
};

const DEFAULT_PAYMENT_FORM: PaymentFormState = {
  method: "Cash on delivery",
  status: "Pending",
  deliveryCharge: 100,
  discount: 0,
};

function parseJsonArray(input: string | null | undefined): string[] {
  if (!input) return [];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function getImageUrl(product: ProductApi): string | null {
  const gallery = parseJsonArray(product.galleryUrls);
  return product.imageUrl || gallery[0] || null;
}

function getPaletteIndex(id: string): number {
  const numeric = Number(id);
  if (Number.isFinite(numeric)) {
    return Math.abs(numeric) % THUMBNAIL_PALETTE.length;
  }

  let hash = 0;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }
  return Math.abs(hash) % THUMBNAIL_PALETTE.length;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "NA";
}

function getStockStatus(stock: number): ProductStockStatus {
  if (stock <= 0) return "out";
  if (stock <= 5) return "low";
  return "active";
}

function getStockMeta(status: ProductStockStatus) {
  if (status === "out") {
    return {
      label: "Out of stock",
      badgeClass: "bg-[#FCEBEB] text-[#A32D2D]",
      rowClass: "text-[#a5a096]",
    };
  }
  if (status === "low") {
    return {
      label: "Low stock",
      badgeClass: "bg-[#FAEEDA] text-[#854F0B]",
      rowClass: "text-[#201f1c]",
    };
  }
  return {
    label: "In stock",
    badgeClass: "bg-[#EAF3DE] text-[#3B6D11]",
    rowClass: "text-[#201f1c]",
  };
}

function normalizeProduct(product: ProductApi): CreateOrderListProduct {
  const category = product.category?.trim() || "General";
  return {
    id: product.id,
    name: product.name,
    category,
    price: Number(product.price ?? 0),
    stock_status: getStockStatus(Number(product.stock ?? 0)),
    image_url: getImageUrl(product),
    searchText: `${product.name} ${category}`.toLowerCase(),
  };
}

function formatRecentOrderId(id: string): string {
  if (id.startsWith("#") || id.startsWith("UX-")) return id;
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `#${compact.slice(0, 4) || "NEW"}`;
}

function backendStatusToUi(status: string | null | undefined): PaymentStatusUi {
  return BACKEND_TO_UI_STATUS[(status || "pending").toLowerCase()] || "Pending";
}

function normalizeNepalPhoneLocal(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("977")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0") && digits.length > NEPAL_PHONE_LOCAL_LENGTH) {
    digits = digits.slice(1);
  }

  return digits.slice(0, NEPAL_PHONE_LOCAL_LENGTH);
}

function buildNepalPhoneNumber(value: string) {
  const localDigits = normalizeNepalPhoneLocal(value);
  return localDigits ? `${NEPAL_PHONE_COUNTRY_CODE}${localDigits}` : "";
}

function getPhoneError(value: string, options?: { live?: boolean }) {
  const localDigits = normalizeNepalPhoneLocal(value);
  if (!localDigits) {
    return options?.live ? undefined : "Enter your 10-digit Nepal mobile number.";
  }
  if (localDigits.length < NEPAL_PHONE_LOCAL_LENGTH) {
    const remainingDigits = NEPAL_PHONE_LOCAL_LENGTH - localDigits.length;
    return `Add ${remainingDigits} more digit${remainingDigits === 1 ? "" : "s"} to complete your mobile number.`;
  }
  if (!/^9\d{9}$/.test(localDigits)) {
    return "Use a valid Nepal mobile number starting with 9.";
  }
  return undefined;
}

function summarizeOrderProducts(order: AdminOrder): string {
  if (!order.items?.length) return "No products";
  return order.items.map((item) => `${item.name} x${item.quantity}`).join(", ");
}

function normalizeRecentOrder(order: AdminOrder): RecentOrderRow {
  return {
    id: order.id,
    display_id: formatRecentOrderId(order.id),
    customer_name: order.fullName || "Customer",
    phone: order.phoneNumber || "",
    products_summary: summarizeOrderProducts(order),
    total: Number(order.total ?? 0),
    payment_status: backendStatusToUi(order.status),
  };
}

function createPreviewToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `preview-${Math.random().toString(36).slice(2, 12)}`;
}

function encodeCheckoutSeed(cart: CartItem[], customer: CustomerFormState): string {
  const hasRequiredCustomer = Boolean(customer.fullName.trim() && customer.phone.trim());
  const payload = {
    ...(hasRequiredCustomer && {
      customer: {
        fullName: customer.fullName.trim(),
        phone: buildNepalPhoneNumber(customer.phone.trim()),
        ...(customer.email.trim() && { email: customer.email.trim() }),
        ...(customer.address.trim() && { address: customer.address.trim() }),
        ...(customer.landmark.trim() && { landmark: customer.landmark.trim() }),
      },
    }),
    items: cart.map((item) => ({
      id: item.productId,
      quantity: item.quantity,
      variant: { size: "One Size", color: "Default" },
      product: {
        id: item.productId,
        name: item.name,
        sku: item.productId,
        price: item.priceAtTime,
        stock: item.stock_status === "out" ? 0 : item.stock_status === "low" ? 5 : 99,
        category: item.category,
        images: item.image_url ? [item.image_url] : [],
        variants: [{ size: "One Size", color: "Default", stock: item.stock_status === "out" ? 0 : 99 }],
      },
    })),
  };

  const json = JSON.stringify(payload);
  return typeof window !== "undefined" && typeof window.btoa === "function"
    ? window.btoa(unescape(encodeURIComponent(json)))
    : "";
}

function ProductThumb({
  id,
  name,
  imageUrl,
  size,
  rounded,
  className,
}: {
  id: string;
  name: string;
  imageUrl: string | null;
  size: number;
  rounded: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const palette = THUMBNAIL_PALETTE[getPaletteIndex(id)];
  const initials = getInitials(name);

  if (!imageUrl || failed) {
    return (
      <div
        data-testid={`thumb-fallback-${id}`}
        className={cn("flex shrink-0 items-center justify-center border border-black/8 text-[11px] font-medium", rounded, className)}
        style={{ width: size, height: size, backgroundColor: palette.bg, color: palette.text }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={name}
      className={cn("shrink-0 border border-black/8 object-cover", rounded, className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

function StatusBadge({ status }: { status: PaymentStatusUi }) {
  const className =
    status === "Paid"
      ? "bg-[#EAF3DE] text-[#3B6D11]"
      : status === "Pending"
        ? "bg-[#FAEEDA] text-[#854F0B]"
        : status === "Partial"
          ? "bg-[#E6F1FB] text-[#185FA5]"
          : "bg-[#FCEBEB] text-[#A32D2D]";

  return <span className={cn("inline-flex rounded-full px-2 py-1 text-[10px] font-medium", className)}>{status}</span>;
}

export default function AdminOrdersNew() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const reduceMotion = useReducedMotion();
  const { theme: appTheme } = useThemeStore();
  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: appTheme === "dark" ? "dark" : "light" } }),
    [appTheme],
  );

  const [productQuery, setProductQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(DEFAULT_CUSTOMER_FORM);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(DEFAULT_PAYMENT_FORM);
  const [requiredFieldErrors, setRequiredFieldErrors] = useState<RequiredFieldErrors>({});
  const [recentOrders, setRecentOrders] = useState<RecentOrderRow[]>([]);
  const [recentOrdersSearch, setRecentOrdersSearch] = useState("");
  const [editingCell, setEditingCell] = useState<EditableCell | null>(null);
  const [createdModalState, setCreatedModalState] = useState<CreatedModalState>({
    open: false,
    orderLabel: "",
    total: 0,
    trackingToken: null,
  });
  const [copiedLink, setCopiedLink] = useState<"tracking" | "created" | null>(null);
  const [recentOrdersHydrated, setRecentOrdersHydrated] = useState(false);
  const [previewToken] = useState(createPreviewToken);

  const deferredProductQuery = useDeferredValue(productQuery.trim().toLowerCase());

  const productsQuery = useQuery({
    queryKey: ["admin", "orders", "new", "products"],
    queryFn: () => fetchAdminProductsPage({ page: 1, limit: 500, status: "active" }),
    staleTime: 60_000,
  });

  const recentOrdersQuery = useQuery({
    queryKey: ["admin", "orders", "new", "recent"],
    queryFn: () => fetchAdminOrdersPage({ page: 1, limit: 5 }),
    staleTime: 60_000,
  });

  useEffect(() => {
    setProductPage(1);
  }, [deferredProductQuery]);

  useEffect(() => {
    if (recentOrdersHydrated) return;
    if (recentOrdersQuery.isSuccess) {
      const normalized = recentOrdersQuery.data.data.map(normalizeRecentOrder);
      setRecentOrders(normalized.length ? normalized : RECENT_ORDER_FALLBACKS);
      setRecentOrdersHydrated(true);
      return;
    }
    if (recentOrdersQuery.isError) {
      setRecentOrders(RECENT_ORDER_FALLBACKS);
      setRecentOrdersHydrated(true);
    }
  }, [recentOrdersHydrated, recentOrdersQuery.data, recentOrdersQuery.isError, recentOrdersQuery.isSuccess]);

  const mutation = useMutation({
    mutationFn: (payload: AdminCreateOrderInput) => createAdminOrder(payload),
    onSuccess: (data) => {
      if (!data?.order) {
        toast({
          title: "Order created",
          description: "The order was created, but the server response was incomplete.",
        });
        return;
      }

      const normalizedOrder = normalizeRecentOrder(data.order);
      normalizedOrder.display_id = data.orderNumber || normalizedOrder.display_id;
      setRecentOrders((current) => [normalizedOrder, ...current].slice(0, 6));
      setRecentOrdersHydrated(true);
      setCart([]);
      setCustomerForm(DEFAULT_CUSTOMER_FORM);
      setPaymentForm(DEFAULT_PAYMENT_FORM);
      setCreatedModalState({
        open: true,
        orderLabel: data.orderNumber || normalizedOrder.display_id,
        total: Number(data.total ?? normalizedOrder.total),
        trackingToken: data.order?.trackingToken ?? null,
      });
      setCopiedLink(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "new", "products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orders", "new", "recent"] });
      toast({
        title: "Order created",
        description: `${data.orderNumber || normalizedOrder.display_id} is ready to share.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create order",
        description: getErrorMessage(error, "Please review the order details and try again."),
        variant: "destructive",
      });
    },
  });

  const normalizedProducts = (productsQuery.data?.data ?? []).map(normalizeProduct);
  const filteredProducts = deferredProductQuery
    ? normalizedProducts.filter((product) => product.searchText.includes(deferredProductQuery))
    : normalizedProducts;
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / 8));
  const safeProductPage = Math.min(productPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safeProductPage - 1) * 8, safeProductPage * 8);

  const itemsSelectedCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.priceAtTime * item.quantity, 0);
  const orderTotal = Math.max(0, subtotal + paymentForm.deliveryCharge - paymentForm.discount);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hasCustomerForLink = Boolean(customerForm.fullName.trim() && customerForm.phone.trim());
  const checkoutLink = `${origin}/checkout?admin_order_seed=${encodeURIComponent(encodeCheckoutSeed(cart, customerForm))}`;
  const canShareCheckoutLink = cart.length > 0 && hasCustomerForLink;
  const activeTrackingToken = createdModalState.trackingToken || previewToken;
  const trackingLink = `${origin}/orders/track/${activeTrackingToken}`;

  const filteredRecentOrders = recentOrders.filter((row) => {
    const search = recentOrdersSearch.trim().toLowerCase();
    if (!search) return true;
    return [row.id, row.display_id, row.customer_name, row.phone].some((value) => value.toLowerCase().includes(search));
  });

  const recentOrderColumns: GridColDef<RecentOrderRow>[] = [
    {
      field: "display_id",
      headerName: "Order ID",
      width: 80,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => (
        <span className="font-medium">{params.row.display_id}</span>
      ),
    },
    {
      field: "customer_name",
      headerName: "Customer",
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => {
        const row = params.row;
        const isEditing = editingCell?.rowId === row.id && editingCell.field === "customer_name";
        if (isEditing && editingCell) {
          return (
            <Input
              autoFocus
              value={editingCell.value}
              onChange={(event) => setEditingCell({ ...editingCell, value: event.target.value })}
              onBlur={commitEditing}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitEditing();
                if (event.key === "Escape") setEditingCell(null);
              }}
              className="h-7 w-full rounded-md border-black/15 bg-white px-2 text-[12px] dark:border-border dark:bg-card dark:text-foreground"
              aria-label={`Edit customer name for ${row.display_id}`}
            />
          );
        }
        return (
          <button
            type="button"
            onClick={() => beginEditing(row, "customer_name")}
            className="w-full truncate text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {row.customer_name}
          </button>
        );
      },
    },
    {
      field: "phone",
      headerName: "Phone",
      width: 110,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => {
        const row = params.row;
        const isEditing = editingCell?.rowId === row.id && editingCell.field === "phone";
        if (isEditing && editingCell) {
          return (
            <Input
              autoFocus
              value={editingCell.value}
              onChange={(event) => setEditingCell({ ...editingCell, value: event.target.value })}
              onBlur={commitEditing}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitEditing();
                if (event.key === "Escape") setEditingCell(null);
              }}
              className="h-7 w-full rounded-md border-black/15 bg-white px-2 text-[12px] dark:border-border dark:bg-card dark:text-foreground"
              aria-label={`Edit phone for ${row.display_id}`}
            />
          );
        }
        return (
          <button
            type="button"
            onClick={() => beginEditing(row, "phone")}
            className="w-full truncate text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
          >
            {row.phone || "N.A"}
          </button>
        );
      },
    },
    {
      field: "products_summary",
      headerName: "Products",
      flex: 1.1,
      minWidth: 140,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => (
        <span className="truncate text-[#4B5563] dark:text-muted-foreground">{params.row.products_summary}</span>
      ),
    },
    {
      field: "total",
      headerName: "Total",
      width: 90,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => <span>{formatPrice(params.row.total)}</span>,
    },
    {
      field: "payment_status",
      headerName: "Status",
      width: 110,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => {
        const row = params.row;
        const isEditing = editingCell?.rowId === row.id && editingCell.field === "payment_status";
        if (isEditing && editingCell) {
          return (
            <select
              autoFocus
              value={editingCell.value}
              onBlur={() => setEditingCell(null)}
              onChange={(event) => {
                setRecentOrders((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? { ...item, payment_status: event.target.value as PaymentStatusUi }
                      : item,
                  ),
                );
                setEditingCell(null);
              }}
              className="h-7 rounded-md border border-black/15 bg-white px-2 text-[12px] dark:border-border dark:bg-card dark:text-foreground"
              aria-label={`Edit payment status for ${row.display_id}`}
            >
              <option>Paid</option>
              <option>Pending</option>
              <option>Partial</option>
              <option>Cancelled</option>
            </select>
          );
        }
        return (
          <button
            type="button"
            onClick={() => beginEditing(row, "payment_status")}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded"
            aria-label={`Payment status ${row.payment_status}. Click to edit`}
          >
            <StatusBadge status={row.payment_status} />
          </button>
        );
      },
    },
    {
      field: "actions",
      headerName: "Action",
      width: 70,
      sortable: false,
      renderCell: (params: GridRenderCellParams<RecentOrderRow>) => (
        <button
          type="button"
          onClick={() => beginEditing(params.row, "customer_name")}
          className="text-[11px] text-[#4B5563] transition-colors hover:text-[#1f1e1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded dark:text-muted-foreground dark:hover:text-foreground"
          aria-label={`Edit order ${params.row.display_id}`}
        >
          Edit
        </button>
      ),
    },
  ];

  function updateCustomerField(field: keyof CustomerFormState, value: string) {
    const nextValue = field === "phone" ? normalizeNepalPhoneLocal(value) : value;
    setCustomerForm((current) => ({ ...current, [field]: nextValue }));
    if (field === "fullName") {
      setRequiredFieldErrors((current) => {
        const next = { ...current };
        if (nextValue.trim()) {
          delete next.fullName;
        }
        return next;
      });
      return;
    }
    if (field === "phone") {
      setRequiredFieldErrors((current) => ({
        ...current,
        phone: getPhoneError(nextValue, { live: true }),
      }));
    }
  }

  function updatePaymentField(field: keyof PaymentFormState, value: string) {
    setPaymentForm((current) => {
      if (field === "deliveryCharge" || field === "discount") {
        const next = Number(value);
        return { ...current, [field]: Number.isFinite(next) ? Math.max(0, next) : 0 };
      }
      return { ...current, [field]: value } as PaymentFormState;
    });
  }

  function addProduct(product: CreateOrderListProduct) {
    if (product.stock_status === "out") return;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) {
        return [
          ...current,
          {
            productId: product.id,
            name: product.name,
            category: product.category,
            priceAtTime: product.price,
            quantity: 1,
            stock_status: product.stock_status,
            image_url: product.image_url,
          },
        ];
      }
      return current.map((item) =>
        item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  }

  function updateCartQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function removeCartItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  function beginEditing(row: RecentOrderRow, field: EditableField) {
    setEditingCell({ rowId: row.id, field, value: String(row[field]) });
  }

  function commitEditing() {
    if (!editingCell) return;
    setRecentOrders((current) =>
      current.map((row) =>
        row.id === editingCell.rowId
          ? {
              ...row,
              [editingCell.field]: editingCell.value,
            }
          : row,
      ),
    );
    setEditingCell(null);
  }

  async function copyText(value: string, key: "tracking" | "created") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLink(key);
      window.setTimeout(() => setCopiedLink((current) => (current === key ? null : current)), 1400);
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  }

  function handleCreateOrder() {
    if (!cart.length) {
      toast({ title: "Add at least one product", variant: "destructive" });
      return;
    }

    const nextRequiredErrors: RequiredFieldErrors = {};
    if (!customerForm.fullName.trim()) {
      nextRequiredErrors.fullName = "Customer name is required.";
    }
    if (!customerForm.phone.trim()) {
      nextRequiredErrors.phone = "Phone number is required.";
    } else {
      const phoneError = getPhoneError(customerForm.phone);
      if (phoneError) {
        nextRequiredErrors.phone = phoneError;
      }
    }
    if (Object.keys(nextRequiredErrors).length > 0) {
      setRequiredFieldErrors(nextRequiredErrors);
      toast({
        title: "Missing required customer details",
        description: "Customer name and phone number are required before creating an order.",
        variant: "destructive",
      });
      return;
    }

    const fullName = customerForm.fullName.trim();
    const phone = buildNepalPhoneNumber(customerForm.phone.trim());
    const email = customerForm.email.trim();
    const address = customerForm.address.trim();
    const landmark = customerForm.landmark.trim();
    const [firstName = "", ...lastParts] = fullName.split(/\s+/).filter(Boolean);
    const lastName = lastParts.join(" ");

    mutation.mutate({
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtTime: item.priceAtTime,
      })),
      shipping: {
        fullName: fullName || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        deliveryLocation: landmark || undefined,
      },
      paymentMethod: PAYMENT_METHOD_MAP[paymentForm.method],
      deliveryFee: paymentForm.deliveryCharge,
      source: "admin",
      status: UI_TO_BACKEND_STATUS[paymentForm.status],
    });
  }

  return (
    <div className="min-h-full bg-[#f7f6f2] p-4 text-[#1f1e1a] sm:p-6 dark:bg-background dark:text-foreground">
      <div className="mx-auto max-w-[1320px] space-y-4">
        <header className="space-y-1">
          <h1 className="text-[20px] font-medium leading-none text-[#1f1e1a] dark:text-foreground">Create order</h1>
          <p className="text-[12px] text-[#4B5563] dark:text-muted-foreground">Home › Orders › New</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="space-y-4">
            <section className={cn(CARD_CLASS, "p-4")}>
              <div className="mb-4">
                <h2 className="text-[15px] font-medium text-[#1f1e1a] dark:text-foreground">Select products</h2>
                <p className="mt-1 text-[12px] text-[#4B5563] dark:text-muted-foreground">Search and add products to this order</p>
              </div>

              <div className="mb-3 flex items-center gap-2 rounded-lg border border-black/8 bg-[#f6f5f1] px-3 dark:border-border dark:bg-muted">
                <Search className="size-4 text-[#4B5563] dark:text-muted-foreground" />
                <Input
                  value={productQuery}
                  onChange={(event) => setProductQuery(event.target.value)}
                  placeholder="Search by name or category..."
                  className="border-0 bg-transparent px-0 text-[13px] text-[#1f1e1a] shadow-none focus-visible:ring-0 dark:text-foreground dark:placeholder:text-muted-foreground"
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-black/8 dark:border-border">
                <div className="grid grid-cols-[44px_minmax(0,1fr)_88px_88px_32px] items-center bg-[#f6f5f1] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.06em] text-[#4B5563] dark:bg-muted dark:text-muted-foreground">
                  <span />
                  <span>Product</span>
                  <span className="text-center">Stock</span>
                  <span className="pr-2 text-right">Price</span>
                  <span />
                </div>

                <div>
                  {productsQuery.isPending ? (
                    <div className="px-3 py-10 text-center text-[13px] text-[#4B5563] dark:text-muted-foreground">Loading products...</div>
                  ) : productsQuery.isError ? (
                    <div className="flex flex-col items-center gap-3 px-3 py-10 text-center">
                      <p className="text-[13px] text-[#A32D2D] dark:text-destructive">
                        Couldn't load products. {getErrorMessage(productsQuery.error)}
                      </p>
                      <button
                        type="button"
                        onClick={() => productsQuery.refetch()}
                        className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-[12px] font-medium text-[#1f1e1a] transition-colors hover:bg-[#f6f5f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                      >
                        Retry
                      </button>
                    </div>
                  ) : paginatedProducts.length ? (
                    paginatedProducts.map((product) => {
                      const inCart = cart.some((item) => item.productId === product.id);
                      const stockMeta = getStockMeta(product.stock_status);
                      return (
                        <div
                          key={product.id}
                          className={cn(
                            "grid grid-cols-[44px_minmax(0,1fr)_88px_88px_32px] items-center border-t border-black/8 px-3 py-[9px] transition-colors first:border-t-0 dark:border-border",
                            inCart
                              ? "bg-[#EAF3DE] dark:bg-green-950/40"
                              : "bg-white hover:bg-[#f6f5f1] dark:bg-card dark:hover:bg-muted",
                            product.stock_status === "out" && "bg-white text-[#a5a096] dark:bg-card dark:text-muted-foreground/70",
                          )}
                        >
                          <ProductThumb id={product.id} name={product.name} imageUrl={product.image_url} size={36} rounded="rounded-md" />
                          <div className="min-w-0 px-2">
                            <p className={cn("truncate text-[13px] font-medium", stockMeta.rowClass)}>{product.name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-[#4B5563] dark:text-muted-foreground">{product.category}</p>
                          </div>
                          <div className="flex justify-center">
                            <span className={cn("inline-flex rounded-full px-2 py-1 text-[10px] font-medium", stockMeta.badgeClass)}>
                              {stockMeta.label}
                            </span>
                          </div>
                          <div className={cn("pr-2 text-right text-[13px] font-medium", product.stock_status === "out" ? "text-[#a5a096] dark:text-muted-foreground/70" : "text-[#1f1e1a] dark:text-foreground")}>
                            {formatPrice(product.price)}
                          </div>
                          <button
                            type="button"
                            aria-label={inCart ? `Increase ${product.name}` : `Add ${product.name}`}
                            disabled={product.stock_status === "out"}
                            onClick={() => addProduct(product)}
                            className={cn(
                              "flex size-[26px] items-center justify-center rounded-full border border-black/10 bg-white text-[#374151] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-border dark:bg-card dark:text-muted-foreground",
                              inCart && "border-[#3B6D11] bg-[#3B6D11] text-white dark:border-green-700 dark:bg-green-700 dark:text-white",
                              product.stock_status !== "out" && !inCart && "hover:border-black/30 hover:text-[#1f1e1a] dark:hover:border-border dark:hover:text-foreground",
                              product.stock_status === "out" && "cursor-not-allowed opacity-40",
                            )}
                          >
                            {inCart ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-10 text-center text-[13px] text-[#4B5563] dark:text-muted-foreground">No products match your search.</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[12px] text-[#4B5563] dark:text-muted-foreground">
                  {filteredProducts.length ? `${(safeProductPage - 1) * 8 + 1}-${Math.min(safeProductPage * 8, filteredProducts.length)} of ${filteredProducts.length}` : "0-0 of 0"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={safeProductPage <= 1}
                    onClick={() => setProductPage((current) => Math.max(1, current - 1))}
                    className="flex size-7 items-center justify-center rounded-lg border border-black/8 bg-white text-[#374151] transition-colors hover:bg-[#f6f5f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-35 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setProductPage(pageNumber)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg border text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        pageNumber === safeProductPage
                          ? "border-black bg-black text-white dark:border-primary dark:bg-primary dark:text-primary-foreground"
                          : "border-black/8 bg-white text-[#374151] hover:bg-[#f6f5f1] dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted",
                      )}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={safeProductPage >= totalPages}
                    onClick={() => setProductPage((current) => Math.min(totalPages, current + 1))}
                    className="flex size-7 items-center justify-center rounded-lg border border-black/8 bg-white text-[#374151] transition-colors hover:bg-[#f6f5f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-35 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className={cn(CARD_CLASS, "p-4")}>
              <div className="mb-4">
                <h2 className="text-[15px] font-medium text-[#1f1e1a] dark:text-foreground">Customer details</h2>
                <p className="mt-1 text-[12px] text-[#4B5563] dark:text-muted-foreground">Fill in delivery and contact information</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block" htmlFor="customer-fullname">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Full name <span className="text-[#A32D2D] dark:text-destructive">*</span></span>
                  <Input
                    id="customer-fullname"
                    value={customerForm.fullName}
                    onChange={(event) => updateCustomerField("fullName", event.target.value)}
                    className={cn(INPUT_CLASS, requiredFieldErrors.fullName && "border-[#A32D2D] focus-visible:border-[#A32D2D] dark:border-destructive dark:focus-visible:border-destructive")}
                    placeholder="Customer name"
                    aria-required="true"
                    aria-invalid={Boolean(requiredFieldErrors.fullName)}
                    aria-describedby={requiredFieldErrors.fullName ? "customer-fullname-error" : undefined}
                  />
                  {requiredFieldErrors.fullName ? (
                    <span id="customer-fullname-error" role="alert" className="mt-1 block text-[11px] text-[#A32D2D] dark:text-destructive">{requiredFieldErrors.fullName}</span>
                  ) : null}
                </label>
                <label className="block" htmlFor="customer-phone">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Phone number <span className="text-[#A32D2D] dark:text-destructive">*</span></span>
                  <div
                    className={cn(
                      "relative flex h-10 overflow-hidden rounded-lg border bg-[#f6f5f1] transition-colors dark:bg-muted",
                      requiredFieldErrors.phone
                        ? "border-[#A32D2D] dark:border-destructive"
                        : "border-black/10 focus-within:border-black/25 dark:border-border dark:focus-within:border-ring",
                    )}
                  >
                    <div className="pointer-events-none flex items-center gap-2 border-r border-black/10 bg-white px-3 dark:border-border dark:bg-card">
                      <img src="/nepal-flag-icon.svg" alt="Nepal flag" className="h-4 w-6 object-cover" />
                      <span className="text-[12px] font-semibold tracking-wide text-[#1f1e1a] dark:text-foreground">{NEPAL_PHONE_COUNTRY_CODE}</span>
                    </div>
                    <Input
                      id="customer-phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="98XXXXXXXX"
                      value={customerForm.phone}
                      onChange={(event) => updateCustomerField("phone", event.target.value)}
                      onBlur={(event) => {
                        setRequiredFieldErrors((current) => ({
                          ...current,
                          phone: getPhoneError(event.target.value),
                        }));
                      }}
                      className="h-full rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                      maxLength={NEPAL_PHONE_LOCAL_LENGTH}
                      aria-required="true"
                      aria-invalid={Boolean(requiredFieldErrors.phone)}
                      aria-describedby="customer-phone-feedback"
                    />
                  </div>
                  <span
                    id="customer-phone-feedback"
                    role={requiredFieldErrors.phone ? "alert" : undefined}
                    aria-live="polite"
                    className={requiredFieldErrors.phone ? "mt-1 block text-[11px] text-[#A32D2D] dark:text-destructive" : "mt-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground"}
                  >
                    {requiredFieldErrors.phone || "Nepal mobile number only. The +977 country code is already added for you."}
                  </span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Email</span>
                  <Input value={customerForm.email} onChange={(event) => updateCustomerField("email", event.target.value)} className={INPUT_CLASS} placeholder="email@example.com" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Address</span>
                  <Input value={customerForm.address} onChange={(event) => updateCustomerField("address", event.target.value)} className={INPUT_CLASS} placeholder="Street address" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Landmark</span>
                  <Input value={customerForm.landmark} onChange={(event) => updateCustomerField("landmark", event.target.value)} className={INPUT_CLASS} placeholder="Near..." />
                </label>
              </div>
            </section>
          </div>

          <aside className={cn(CARD_CLASS, "p-4 lg:sticky lg:top-4")}>
            <div>
              <h2 className="text-[15px] font-medium text-[#1f1e1a] dark:text-foreground">Order summary</h2>
              <p className="mt-1 text-[11px] text-[#4B5563] dark:text-muted-foreground">{itemsSelectedCount} items selected</p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {cart.length ? (
                  cart.map((item) => (
                    <motion.div
                      key={item.productId}
                      layout
                      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                      className="flex items-center gap-2 rounded-lg border border-black/8 bg-[#f6f5f1] px-3 py-2 dark:border-border dark:bg-muted"
                    >
                      <ProductThumb id={item.productId} name={item.name} imageUrl={item.image_url} size={30} rounded="rounded-[5px]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[#1f1e1a] dark:text-foreground">{item.name}</p>
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name} quantity`}
                            className="flex size-[18px] items-center justify-center rounded-[3px] border border-black/10 bg-white text-[#1f1e1a] transition-colors hover:bg-[#f1efe8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/70"
                            onClick={() => updateCartQuantity(item.productId, -1)}
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="min-w-[14px] text-center text-[11px] font-medium text-[#1f1e1a] dark:text-foreground">{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name} quantity`}
                            className="flex size-[18px] items-center justify-center rounded-[3px] border border-black/10 bg-white text-[#1f1e1a] transition-colors hover:bg-[#f1efe8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted/70"
                            onClick={() => updateCartQuantity(item.productId, 1)}
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-medium text-[#1f1e1a] dark:text-foreground">{formatPrice(item.priceAtTime * item.quantity)}</p>
                        <button
                          type="button"
                          className="mt-1 text-[10px] text-[#4B5563] transition-colors hover:text-[#A32D2D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded dark:text-muted-foreground dark:hover:text-destructive"
                          onClick={() => removeCartItem(item.productId)}
                        >
                          Remove
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    key="empty-cart"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={reduceMotion ? undefined : { opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg border border-dashed border-black/8 px-3 py-8 text-center text-[12px] text-[#4B5563] dark:border-border dark:text-muted-foreground"
                  >
                    No products added yet
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="my-4 h-px bg-black/8 dark:bg-border" />

            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Payment method</span>
                <select value={paymentForm.method} onChange={(event) => updatePaymentField("method", event.target.value)} className={cn(INPUT_CLASS, "w-full")}>
                  <option>Cash on delivery</option>
                  <option>Online transfer</option>
                  <option>Esewa-Khalti</option>
                  <option>Card</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Payment status</span>
                  <select value={paymentForm.status} onChange={(event) => updatePaymentField("status", event.target.value)} className={cn(INPUT_CLASS, "w-full")}>
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Partial</option>
                    <option>Cancelled</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Delivery charge</span>
                  <Input type="number" value={paymentForm.deliveryCharge} onChange={(event) => updatePaymentField("deliveryCharge", event.target.value)} className={INPUT_CLASS} />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] text-[#4B5563] dark:text-muted-foreground">Discount</span>
                <Input type="number" value={paymentForm.discount} onChange={(event) => updatePaymentField("discount", event.target.value)} className={INPUT_CLASS} />
              </label>
            </div>

            <div className="my-4 h-px bg-black/8 dark:bg-border" />

            <div className="space-y-1.5 text-[13px] text-[#374151] dark:text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Delivery</span>
                <span>{formatPrice(paymentForm.deliveryCharge)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <span className="text-[#A32D2D] dark:text-destructive">- {formatPrice(paymentForm.discount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-black/8 pt-2 text-[14px] font-medium text-[#1f1e1a] dark:border-border dark:text-foreground">
                <span>Order total</span>
                <span>{formatPrice(orderTotal)}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Button
                type="button"
                className="h-11 w-full rounded-md bg-black px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/85 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                loading={mutation.isPending}
                loadingText="Creating..."
                onClick={handleCreateOrder}
              >
                Create order
              </Button>
              <div className="w-full">
                <GenerateCustomLinkUI
                  link={checkoutLink}
                  disabled={!canShareCheckoutLink}
                  disabledReason={!canShareCheckoutLink ? "Fill in customer details and add products to generate a checkout link" : undefined}
                  onGenerate={() => {}}
                />
              </div>
            </div>
          </aside>
        </div>

        <section className={cn(CARD_CLASS, "p-4")}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[15px] font-medium text-[#1f1e1a] dark:text-foreground">Recent orders</h2>
              <p className="mt-1 text-[12px] text-[#4B5563] dark:text-muted-foreground">Click any cell to edit inline</p>
            </div>
            <Input
              value={recentOrdersSearch}
              onChange={(event) => setRecentOrdersSearch(event.target.value)}
              placeholder="Search orders..."
              className={cn(INPUT_CLASS, "w-full sm:w-[180px]")}
              aria-label="Search orders"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse">
              <thead>
                <tr className="bg-[#f6f5f1] text-left text-[10px] font-medium uppercase tracking-[0.05em] text-[#4B5563] dark:bg-muted dark:text-muted-foreground">
                  <th className="w-[70px] px-3 py-2">Order ID</th>
                  <th className="w-[130px] px-3 py-2">Customer</th>
                  <th className="w-[90px] px-3 py-2">Phone</th>
                  <th className="w-[140px] px-3 py-2">Products</th>
                  <th className="w-[80px] px-3 py-2">Total</th>
                  <th className="w-[80px] px-3 py-2">Status</th>
                  <th className="w-[50px] px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {!recentOrdersHydrated && recentOrdersQuery.isPending ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[12px] text-[#4B5563] dark:text-muted-foreground">
                      Loading recent orders...
                    </td>
                  </tr>
                ) : filteredRecentOrders.length ? (
                  filteredRecentOrders.map((row) => {
                    const isCustomerEditing = editingCell?.rowId === row.id && editingCell.field === "customer_name";
                    const isPhoneEditing = editingCell?.rowId === row.id && editingCell.field === "phone";
                    const isStatusEditing = editingCell?.rowId === row.id && editingCell.field === "payment_status";

                    return (
                      <tr key={row.id} className="border-t border-black/8 text-[12px] text-[#1f1e1a] transition-colors hover:bg-[#f6f5f1] dark:border-border dark:text-foreground dark:hover:bg-muted/70">
                        <td className="px-3 py-2 font-medium">{row.display_id}</td>
                        <td className="px-3 py-2">
                          {isCustomerEditing && editingCell ? (
                            <Input
                              autoFocus
                              value={editingCell.value}
                              onChange={(event) => setEditingCell({ ...editingCell, value: event.target.value })}
                              onBlur={commitEditing}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") commitEditing();
                                if (event.key === "Escape") setEditingCell(null);
                              }}
                              className="h-7 rounded-md border-black/15 bg-white px-2 text-[12px] dark:border-border dark:bg-card dark:text-foreground"
                              aria-label={`Edit customer name for ${row.display_id}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEditing(row, "customer_name")}
                              className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={`Edit customer name for ${row.display_id} (currently ${row.customer_name})`}
                            >
                              {row.customer_name}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isPhoneEditing && editingCell ? (
                            <Input
                              autoFocus
                              value={editingCell.value}
                              onChange={(event) => setEditingCell({ ...editingCell, value: event.target.value })}
                              onBlur={commitEditing}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") commitEditing();
                                if (event.key === "Escape") setEditingCell(null);
                              }}
                              className="h-7 rounded-md border-black/15 bg-white px-2 text-[12px] dark:border-border dark:bg-card dark:text-foreground"
                              aria-label={`Edit phone for ${row.display_id}`}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEditing(row, "phone")}
                              className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={`Edit phone for ${row.display_id}`}
                            >
                              {row.phone || "N.A"}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[#4B5563] dark:text-muted-foreground">{row.products_summary}</td>
                        <td className="px-3 py-2">{formatPrice(row.total)}</td>
                        <td className="px-3 py-2">
                          {isStatusEditing && editingCell ? (
                            <select
                              autoFocus
                              value={editingCell.value}
                              onBlur={() => setEditingCell(null)}
                              onChange={(event) => {
                                setRecentOrders((current) =>
                                  current.map((item) =>
                                    item.id === row.id
                                      ? { ...item, payment_status: event.target.value as PaymentStatusUi }
                                      : item,
                                  ),
                                );
                                setEditingCell(null);
                              }}
                              className="h-7 rounded-md border border-black/15 bg-white px-2 text-[12px] dark:border-border dark:bg-card dark:text-foreground"
                              aria-label={`Edit payment status for ${row.display_id}`}
                            >
                              <option>Paid</option>
                              <option>Pending</option>
                              <option>Partial</option>
                              <option>Cancelled</option>
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEditing(row, "payment_status")}
                              className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              aria-label={`Payment status ${row.payment_status}. Click to edit`}
                            >
                              <StatusBadge status={row.payment_status} />
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => beginEditing(row, "customer_name")}
                            className="rounded text-[11px] text-[#4B5563] transition-colors hover:text-[#1f1e1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-muted-foreground dark:hover:text-foreground"
                            aria-label={`Edit order ${row.display_id}`}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[12px] text-[#4B5563] dark:text-muted-foreground">
                      No recent orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog
        open={createdModalState.open}
        onOpenChange={(open) => setCreatedModalState((current) => ({ ...current, open }))}
      >
        <DialogContent className="w-[400px] max-w-[calc(100vw-2rem)] rounded-xl border border-black/8 bg-white p-[22px] shadow-2xl [&>button]:hidden">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[15px] font-medium text-[#1f1e1a]">Order created</DialogTitle>
            <DialogDescription className="text-[12px] text-[#4B5563]">
              {createdModalState.orderLabel} · {formatPrice(createdModalState.total)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {[
              ["Order placed", "Just now", "#1D9E75"],
              ["Processing", "In progress", "#378ADD"],
              ["Out for delivery", "Pending", "#d6d1c5"],
              ["Delivered", "Pending", "#d6d1c5"],
            ].map(([label, time, color], index, array) => (
              <div key={label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1 block size-[10px] rounded-full" style={{ backgroundColor: color }} />
                  {index < array.length - 1 ? <span className="mt-1 h-4 w-px bg-black/10" /> : null}
                </div>
                <div>
                  <p className="text-[12px] font-medium text-[#1f1e1a]">{label}</p>
                  <p className="text-[11px] text-[#4B5563]">{time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button type="button" variant="outline" className="min-h-10 flex-1 rounded-lg border-black/10 bg-[#f6f5f1] text-[#1f1e1a]" onClick={() => copyText(trackingLink, "created")}>
              <Copy className="size-4" />
              {copiedLink === "created" ? "Copied!" : "Copy tracking link"}
            </Button>
            <Button type="button" className="min-h-10 flex-1 rounded-lg bg-black text-white hover:bg-black/85" onClick={() => setCreatedModalState((current) => ({ ...current, open: false }))}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
