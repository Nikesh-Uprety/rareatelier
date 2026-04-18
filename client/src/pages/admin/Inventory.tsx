import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Boxes,
  ChartColumnBig,
  Ellipsis,
  FileSpreadsheet,
  Package2,
  Search,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StockInSheet } from "./inventoryComponents";
import type {
  InventoryActivityEntry,
  InventoryListItem,
  InventoryMovement,
  InventoryProductDetail,
  InventorySummary,
  StockInSelection,
} from "./inventoryTypes";
import {
  EMPTY_SUMMARY,
  formatMovementDate,
  formatMovementTime,
  formatNpr,
  getMovementTypeLabel,
  getStatusLabel,
} from "./inventoryUtils";
import "./inventory-workspace.css";

type InventorySection =
  | "all_items"
  | "bulk_operations"
  | "billing"
  | "alerts"
  | "valuation"
  | "movements";
type DetailTab = "activity" | "details" | "valuation" | "movement" | "alerts";
type LightTab = "overview" | "inventory" | "movements";
type InventoryKpiCard = {
  label: string;
  value: string | number;
  helper: string;
  tone?: string;
};
type StagedAction =
  | {
      title: string;
      description: string;
      ctaLabel?: string;
      ctaHref?: string;
      openStockIn?: boolean;
    }
  | null;

type InventoryWorkspaceMode = "platinum" | "light";

const INVENTORY_PLATINUM_MONTHLY_PRICE = 2000;
const INVENTORY_PLATINUM_ALLOWED_ROLES = new Set(["superadmin", "owner", "admin", "manager"]);

const SECTION_QUERY_MAP: Record<InventorySection, string | null> = {
  all_items: null,
  bulk_operations: "bulk",
  billing: "billing",
  alerts: "alerts",
  valuation: "valuation",
  movements: "movements",
};

const SECTION_LABELS: Record<InventorySection, string> = {
  all_items: "All items",
  bulk_operations: "Bulk operations",
  billing: "Billing",
  alerts: "Low stock alerts",
  valuation: "Stock valuation",
  movements: "Stock movement",
};

const DETAIL_TAB_LABELS: Record<DetailTab, string> = {
  activity: "Activity",
  details: "Item details",
  valuation: "Valuation",
  movement: "Movement",
  alerts: "Alerts",
};

function getSectionFromUrl(): InventorySection {
  if (typeof window === "undefined") return "all_items";
  const tab = new URLSearchParams(window.location.search).get("tab");

  switch (tab) {
    case "bulk":
      return "bulk_operations";
    case "billing":
      return "billing";
    case "alerts":
      return "alerts";
    case "valuation":
      return "valuation";
    case "movements":
    case "movement":
      return "movements";
    default:
      return "all_items";
  }
}

function getInventoryWorkspaceMode(pathname: string): InventoryWorkspaceMode | null {
  if (pathname === "/admin/inventory/platinum") return "platinum";
  if (pathname === "/admin/inventory/light") return "light";
  return null;
}

function canAccessInventoryPlatinum(role: string | null | undefined) {
  if (!role) return false;
  return INVENTORY_PLATINUM_ALLOWED_ROLES.has(role.toLowerCase());
}

function usePrefersDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`Request failed for ${url}`);
  return response.json() as Promise<T>;
}

function exportInventoryCsv(items: InventoryListItem[]) {
  const rows = [
    ["Item", "Variant", "Category", "Outlet", "Channel", "SKU", "Qty", "Cost Price", "Sales Price", "Stock Value", "Status"],
    ...items.map((item) => [
      item.name,
      item.variant,
      item.category,
      item.outlet,
      item.channel,
      item.sku,
      String(item.units),
      String(item.costPrice),
      String(item.sellingPrice),
      String(item.totalValue),
      item.status,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getActivityScopeDefault(section: InventorySection): DetailTab {
  switch (section) {
    case "alerts":
      return "alerts";
    case "valuation":
      return "valuation";
    case "movements":
      return "movement";
    default:
      return "activity";
  }
}

function getQuantityTone(status: InventoryListItem["status"]) {
  switch (status) {
    case "out_of_stock":
      return "low";
    case "low_stock":
      return "warn";
    default:
      return "ok";
  }
}

function getAvatarLabel(item: InventoryListItem | null) {
  if (!item) return "RR";
  const [firstPart = "", secondPart = ""] = item.variant.split(/[ /-]+/);
  const compact = `${firstPart[0] ?? ""}${secondPart[0] ?? ""}`.toUpperCase();
  return compact || item.size.slice(0, 2).toUpperCase() || item.name.slice(0, 2).toUpperCase();
}

function getStatusBadgeClass(status: InventoryListItem["status"]) {
  switch (status) {
    case "out_of_stock":
      return "inventory-badge inventory-badge--red";
    case "low_stock":
      return "inventory-badge inventory-badge--amber";
    default:
      return "inventory-badge inventory-badge--green";
  }
}

function getActivityBadgeClass(entry: InventoryActivityEntry) {
  if (entry.delta < 0) return "inventory-badge inventory-badge--red";
  if (entry.movementType === "transfer") return "inventory-badge inventory-badge--amber";
  return "inventory-badge inventory-badge--green";
}

function buildDetailsFallback(item: InventoryListItem): InventoryProductDetail {
  return {
    productId: item.productId,
    name: item.name,
    thumbnail: item.thumbnail,
    category: item.category,
    channel: item.channel,
    outlet: item.outlet,
    productCode: item.sku,
    description: `${item.category} inventory item tracked inside ${item.outlet}.`,
    variants: [
      {
        id: item.id,
        variantId: item.variantId,
        label: item.variant,
        sku: item.sku,
        size: item.size,
        units: item.units,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        stockValue: item.totalValue,
        status: item.status,
      },
    ],
    activity: [],
  };
}

function ItemThumbnail({
  item,
  size = "md",
}: {
  item: InventoryListItem;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "size-8 rounded-xl text-xs" : size === "lg" ? "size-14 rounded-3xl text-base" : "size-10 rounded-2xl text-sm";
  if (item.thumbnail) {
    return (
      <img
        src={item.thumbnail}
        alt={item.name}
        loading="lazy"
        width={size === "sm" ? 32 : size === "lg" ? 56 : 40}
        height={size === "sm" ? 32 : size === "lg" ? 56 : 40}
        className={cn(sizeClass, "shrink-0 object-cover")}
      />
    );
  }
  return (
    <div className={cn(sizeClass, "flex shrink-0 items-center justify-center bg-primary/10 text-primary font-semibold")}>
      {getAvatarLabel(item)}
    </div>
  );
}

function LightProductDialog({
  open,
  onClose,
  selectedItem,
  allVariants,
  detail,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  selectedItem: InventoryListItem | null;
  allVariants: InventoryListItem[];
  detail: InventoryProductDetail | null;
  onConfirm: (selections: StockInSelection[]) => void;
  isPending: boolean;
}) {
  const [addQty, setAddQty] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open) setAddQty({});
  }, [open, selectedItem?.productId]);

  if (!selectedItem) return null;

  const imageUrl = detail?.thumbnail ?? selectedItem.thumbnail;
  const totalAdding = Object.values(addQty).reduce((sum, q) => sum + q, 0);
  const sizeCount = Object.values(addQty).filter((q) => q > 0).length;

  const handleConfirm = () => {
    const selections = allVariants
      .filter((v) => (addQty[v.id] ?? 0) > 0)
      .map((v) => ({ id: v.id, productId: v.productId, variantId: v.variantId, qty: addQty[v.id] }));
    if (selections.length > 0) onConfirm(selections);
  };

  const setVariantQty = (id: string, val: number) =>
    setAddQty((prev) => ({ ...prev, [id]: Math.max(0, val) }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="flex flex-col sm:flex-row">
          {/* Product photo */}
          <div className="relative w-full shrink-0 bg-muted sm:w-52">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={selectedItem.name}
                loading="lazy"
                className="h-52 w-full object-cover sm:h-full sm:min-h-[460px]"
              />
            ) : (
              <div className="flex h-52 w-full items-center justify-center sm:h-full sm:min-h-[460px]">
                <span className="text-6xl font-bold text-muted-foreground/20">{getAvatarLabel(selectedItem)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent sm:hidden" />
          </div>

          {/* Right panel */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Header */}
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold leading-snug">{selectedItem.name}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedItem.category} · {detail?.productCode ?? selectedItem.sku}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    selectedItem.status === "in_stock"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : selectedItem.status === "low_stock"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
                  )}
                >
                  {getStatusLabel(selectedItem.status)}
                </span>
              </div>
            </div>

            {/* Stock controls */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Add stock by size / variant
              </p>
              <div className="space-y-2">
                {allVariants.map((variant) => {
                  const qty = addQty[variant.id] ?? 0;
                  return (
                    <div
                      key={variant.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{variant.variant}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Now:{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              variant.status === "in_stock"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : variant.status === "low_stock"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            {variant.units}
                          </span>{" "}
                          units · {variant.sku}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setVariantQty(variant.id, qty - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-muted"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => setVariantQty(variant.id, Number(e.target.value) || 0)}
                          className="h-8 w-14 rounded-lg border border-border bg-background text-center text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => setVariantQty(variant.id, qty + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-sm font-medium transition-colors hover:bg-muted"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                {totalAdding > 0
                  ? `+${totalAdding} units across ${sizeCount} size${sizeCount !== 1 ? "s" : ""}`
                  : "Enter qty above to add stock"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" disabled={totalAdding === 0 || isPending} onClick={handleConfirm}>
                  {isPending ? "Adding…" : "Add to inventory"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InventoryEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Package2;
  title: string;
  description: string;
}) {
  return (
    <Empty className="border-border bg-background/70">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent />
    </Empty>
  );
}

function PlatinumItemDetails({
  detail,
  selectedItem,
}: {
  detail: InventoryProductDetail | null;
  selectedItem: InventoryListItem;
}) {
  const variants = detail?.variants ?? [];
  const totalCost = variants.reduce((sum, variant) => sum + variant.units * variant.costPrice, 0);
  const totalValue = variants.reduce((sum, variant) => sum + variant.stockValue, 0);
  const movementSummary = (detail?.activity ?? []).reduce(
    (acc, entry) => {
      if (entry.movementType === "stock_in") acc.stockIn += entry.quantity;
      else if (entry.movementType === "stock_out") acc.stockOut += entry.quantity;
      else acc.transfer += entry.quantity;
      return acc;
    },
    { stockIn: 0, stockOut: 0, transfer: 0 },
  );
  const reorderPoint = 10;
  const targetLevel = 25;
  const progress = Math.max(0, Math.min(100, (selectedItem.units / targetLevel) * 100));
  const suggestedOrder = Math.max(0, targetLevel - selectedItem.units);

  return {
    details: (
      <div className="space-y-3">
        <div className="inventory-details-grid">
          <div className="inventory-detail-cell">
            <div className="inventory-detail-label">Category</div>
            <div className="inventory-detail-value">{detail?.category || selectedItem.category}</div>
          </div>
          <div className="inventory-detail-cell">
            <div className="inventory-detail-label">Primary code</div>
            <div className="inventory-detail-value">{detail?.productCode || selectedItem.sku}</div>
          </div>
          <div className="inventory-detail-cell">
            <div className="inventory-detail-label">Channel</div>
            <div className="inventory-detail-value">{detail?.channel || selectedItem.channel}</div>
          </div>
          <div className="inventory-detail-cell">
            <div className="inventory-detail-label">Outlet</div>
            <div className="inventory-detail-value">{detail?.outlet || selectedItem.outlet}</div>
          </div>
          <div className="inventory-detail-cell">
            <div className="inventory-detail-label">Status</div>
            <div className="inventory-detail-value">{getStatusLabel(selectedItem.status)}</div>
          </div>
          <div className="inventory-detail-cell">
            <div className="inventory-detail-label">Description</div>
            <div className="inventory-detail-value">{detail?.description || "Inventory metadata for the selected item."}</div>
          </div>
        </div>

        <table className="inventory-table">
          <thead>
            <tr>
              <th>Variant</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Selling</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td>{variant.label}</td>
                <td className="inventory-muted-copy">{variant.sku}</td>
                <td>{variant.units}</td>
                <td>{formatNpr(variant.costPrice)}</td>
                <td>{formatNpr(variant.sellingPrice)}</td>
                <td>{formatNpr(variant.stockValue)}</td>
                <td>
                  <span className={getStatusBadgeClass(variant.status)}>{getStatusLabel(variant.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    valuation: (
      <div className="space-y-3">
        <div className="inventory-platinum-mini-grid">
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Cost basis</div>
            <div className="inventory-detail-metric-value">{formatNpr(totalCost)}</div>
          </div>
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Inventory value</div>
            <div className="inventory-detail-metric-value">{formatNpr(totalValue)}</div>
          </div>
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Gross spread</div>
            <div className="inventory-detail-metric-value">{formatNpr(totalValue - totalCost)}</div>
          </div>
        </div>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Variant</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Selling</th>
              <th>Projected value</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td>{variant.label}</td>
                <td>{variant.units}</td>
                <td>{formatNpr(variant.costPrice)}</td>
                <td>{formatNpr(variant.sellingPrice)}</td>
                <td>{formatNpr(variant.stockValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
    movement: (
      <div className="space-y-3">
        <div className="inventory-platinum-mini-grid">
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Incoming</div>
            <div className="inventory-detail-metric-value inventory-text-green">+{movementSummary.stockIn}</div>
          </div>
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Outgoing</div>
            <div className="inventory-detail-metric-value inventory-text-red">-{movementSummary.stockOut}</div>
          </div>
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Transfers</div>
            <div className="inventory-detail-metric-value inventory-text-amber">{movementSummary.transfer}</div>
          </div>
        </div>
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Channel</th>
              <th>Type</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(detail?.activity ?? []).length ? (
              (detail?.activity ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.reference}</td>
                  <td className="inventory-muted-copy">{entry.channel}</td>
                  <td><span className={getActivityBadgeClass(entry)}>{getMovementTypeLabel(entry.movementType)}</span></td>
                  <td className="inventory-muted-copy">{formatMovementDate(entry.occurredAt)}</td>
                  <td>{entry.quantity}</td>
                  <td className="inventory-muted-copy">{entry.remarks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="p-6">
                    <InventoryEmpty
                      icon={ChartColumnBig}
                      title="No movement history yet"
                      description="Movement records will appear here as this item starts receiving stock and sales."
                    />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    ),
    alerts: (
      <div className="space-y-3">
        <div className="inventory-alert-card">
          <div className="inventory-section-title">Stock health</div>
          <div className="mt-2 flex items-center gap-2">
            <span className={getStatusBadgeClass(selectedItem.status)}>{getStatusLabel(selectedItem.status)}</span>
            <span className="inventory-muted-copy">
              Reorder point {reorderPoint} units · target level {targetLevel} units
            </span>
          </div>
          <div className="inventory-progress">
            <span
              style={{
                width: `${progress}%`,
                background:
                  selectedItem.status === "in_stock"
                    ? "var(--inv-grn)"
                    : selectedItem.status === "low_stock"
                      ? "var(--inv-amb)"
                      : "var(--inv-red)",
              }}
            />
          </div>
        </div>

        <div className="inventory-platinum-mini-grid">
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Current qty</div>
            <div className={cn("inventory-detail-metric-value", selectedItem.status === "in_stock" ? "inventory-text-green" : selectedItem.status === "low_stock" ? "inventory-text-amber" : "inventory-text-red")}>
              {selectedItem.units}
            </div>
          </div>
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Suggested reorder</div>
            <div className="inventory-detail-metric-value">{suggestedOrder}</div>
          </div>
          <div className="inventory-detail-metric">
            <div className="inventory-detail-metric-label">Risk note</div>
            <div className="inventory-detail-metric-value">
              {selectedItem.status === "in_stock" ? "Healthy" : selectedItem.status === "low_stock" ? "Watch closely" : "Urgent"}
            </div>
          </div>
        </div>
      </div>
    ),
  };
}

function InventoryLightView({
  summary,
  summaryLoading,
  items,
  selectedItem,
  detail,
  movements,
  selectedOutlet,
  outlets,
  onOutletChange,
  searchInput,
  onSearchInputChange,
  chipFilter,
  onChipFilterChange,
  chipOptions,
  onSelectItem,
  onOpenProductDialog,
  onOpenStockIn,
  onOpenBatches,
  canOpenPlatinum,
  onOpenLightWorkspace,
  onOpenPlatinumWorkspace,
}: {
  summary: InventorySummary;
  summaryLoading: boolean;
  items: InventoryListItem[];
  selectedItem: InventoryListItem | null;
  detail: InventoryProductDetail | null;
  movements: InventoryMovement[];
  selectedOutlet: string;
  outlets: string[];
  onOutletChange: (value: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  chipFilter: string;
  onChipFilterChange: (value: string) => void;
  chipOptions: string[];
  onSelectItem: (id: string) => void;
  onOpenProductDialog: (item: InventoryListItem) => void;
  onOpenStockIn: (item?: InventoryListItem) => void;
  onOpenBatches: () => void;
  canOpenPlatinum: boolean;
  onOpenLightWorkspace: () => void;
  onOpenPlatinumWorkspace: () => void;
}) {
  const [lightTab, setLightTab] = useState<LightTab>("inventory");
  const movementPreview = movements.slice(0, 6);
  const lightKpis: InventoryKpiCard[] = [
    { label: "Inventory value", value: formatNpr(summary.totalInventoryValue), helper: `${summary.totalQuantity} units live` },
    { label: "Products", value: `${summary.totalProducts}`, helper: `${summary.totalSkus} total SKUs` },
    { label: "Low stock", value: `${summary.lowStockCount}`, helper: "Needs replenishment" },
    { label: "Out of stock", value: `${summary.criticalStockCount}`, helper: "Action required" },
  ];

  return (
    <div className="space-y-5">
      <div className="inventory-mode-surface inventory-light-surface">
        <div className="inventory-light-header">
          <div className="inventory-light-actions">
            <div className="inventory-workspace-switcher">
              <Button variant="outline" className="inventory-workspace-switcher-btn is-active" onClick={onOpenLightWorkspace}>
                Inventory Light
              </Button>
              <Button variant="outline" className="inventory-workspace-switcher-btn" onClick={onOpenPlatinumWorkspace}>
                {canOpenPlatinum ? "Inventory Platinum" : `Platinum Rs ${INVENTORY_PLATINUM_MONTHLY_PRICE}/mo`}
              </Button>
            </div>
            <ToggleGroup
              type="single"
              value={selectedOutlet}
              onValueChange={(value) => value && onOutletChange(value)}
              variant="outline"
              className="inventory-light-toggle"
            >
              <ToggleGroupItem value="all">All outlets</ToggleGroupItem>
              {outlets.map((outlet) => (
                <ToggleGroupItem key={outlet} value={outlet}>{outlet}</ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button onClick={() => onOpenStockIn(selectedItem ?? undefined)}>
              + Stock in
            </Button>
          </div>
        </div>

        <div className="inventory-light-kpis">
          {summaryLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="inventory-light-kpi">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-3 h-7 w-24" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </div>
              ))
            : lightKpis.map((card) => (
                <div key={card.label} className="inventory-light-kpi">
                  <div className="inventory-light-kpi-label">{card.label}</div>
                  <div className="inventory-light-kpi-value">{card.value}</div>
                  <div className="inventory-light-kpi-helper">{card.helper}</div>
                </div>
              ))}
        </div>

        <Tabs value={lightTab} onValueChange={(value) => setLightTab(value as LightTab)} className="mt-5">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-muted/60 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
              <div className="rounded-3xl border border-border bg-card p-5">
                <div className="inventory-section-heading">Selected item</div>
                {selectedItem ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex items-start gap-4">
                      <ItemThumbnail item={selectedItem} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xl font-semibold">{selectedItem.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {selectedItem.variant} · {detail?.productCode || selectedItem.sku}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-muted/50 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stock qty</div>
                        <div className="mt-2 text-2xl font-semibold">{selectedItem.units}</div>
                      </div>
                      <div className="rounded-2xl bg-muted/50 p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stock value</div>
                        <div className="mt-2 text-2xl font-semibold">{formatNpr(selectedItem.totalValue)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => onOpenStockIn(selectedItem)}>Stock in</Button>
                      <Button variant="outline" onClick={onOpenBatches}>Adjust stock</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <InventoryEmpty
                      icon={Boxes}
                      title="No item selected"
                      description="Pick an item from the inventory list to inspect its details here."
                    />
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-card p-5">
                <div className="inventory-section-heading">Recent movement</div>
                <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movementPreview.map((movement) => (
                        <tr key={movement.id} className="border-t border-border">
                          <td className="px-4 py-3">{getMovementTypeLabel(movement.type)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatMovementDate(movement.occurredAt)}</td>
                          <td className={cn("px-4 py-3 font-semibold", movement.type === "stock_out" ? "text-rose-600" : "text-emerald-600")}>
                            {movement.type === "stock_out" ? "-" : "+"}
                            {movement.quantity}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{movement.ref}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inventory-section-heading">Inventory table</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fast scanning for stock, prices, outlet, and live status.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative min-w-[280px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={searchInput} onChange={(event) => onSearchInputChange(event.target.value)} placeholder="Search items..." className="pl-9" />
                  </div>
                </div>
              </div>

              <ToggleGroup
                type="single"
                value={chipFilter}
                onValueChange={(value) => value && onChipFilterChange(value)}
                variant="outline"
                className="mt-4 flex flex-wrap justify-start"
              >
                {chipOptions.map((chip) => (
                  <ToggleGroupItem key={chip} value={chip}>
                    {chip === "all" ? "All" : chip === "low" ? "Low stock" : chip}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <div className="mt-5 overflow-hidden rounded-2xl border border-border">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Variant</th>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Cost</th>
                      <th className="px-4 py-3">Selling</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length ? (
                      items.map((item) => (
                        <tr
                          key={item.id}
                          className={cn("cursor-pointer border-t border-border transition-colors hover:bg-muted/35", selectedItem?.id === item.id && "bg-primary/5")}
                          onClick={() => { onSelectItem(item.id); onOpenProductDialog(item); }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ItemThumbnail item={item} size="md" />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{item.name}</div>
                                <div className="truncate text-xs text-muted-foreground">{item.category}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{item.variant}</td>
                          <td className="px-4 py-3 text-muted-foreground">{item.outlet}</td>
                          <td className="px-4 py-3">{formatNpr(item.costPrice)}</td>
                          <td className="px-4 py-3">{formatNpr(item.sellingPrice)}</td>
                          <td className={cn("px-4 py-3 font-semibold", item.status === "in_stock" ? "text-emerald-600" : item.status === "low_stock" ? "text-amber-600" : "text-rose-600")}>{item.units}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="border-border bg-background text-foreground">
                              {getStatusLabel(item.status)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6">
                          <InventoryEmpty
                            icon={Search}
                            title="No inventory items found"
                            description="Adjust the outlet or filter chip to bring items back into scope."
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="inventory-section-heading">Movement log</div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementPreview.map((movement) => (
                      <tr key={movement.id} className="border-t border-border">
                        <td className="px-4 py-3 text-muted-foreground">{formatMovementDate(movement.occurredAt)}</td>
                        <td className="px-4 py-3">{getMovementTypeLabel(movement.type)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{movement.outlet}</td>
                        <td className={cn("px-4 py-3 font-semibold", movement.type === "stock_out" ? "text-rose-600" : "text-emerald-600")}>
                          {movement.type === "stock_out" ? "-" : "+"}
                          {movement.quantity}
                        </td>
                        <td className="px-4 py-3">{formatNpr(movement.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InventoryPlatinumUpgrade({
  onOpenLightWorkspace,
}: {
  onOpenLightWorkspace: () => void;
}) {
  return (
    <div className="inventory-premium-gate">
      <div className="inventory-premium-gate-card">
        <div className="inventory-workspace-kicker">Premium inventory workspace</div>
        <div className="inventory-premium-head">
          <div>
            <h1 className="inventory-page-title">Inventory Platinum</h1>
            <p className="inventory-page-copy">
              Platinum is reserved for premium workspaces and advanced operational pages.
            </p>
          </div>
          <Badge className="inventory-premium-badge">Rs {INVENTORY_PLATINUM_MONTHLY_PRICE} / month</Badge>
        </div>

        <div className="inventory-premium-grid">
          <div className="inventory-premium-feature">
            <div className="inventory-section-heading">What Platinum unlocks</div>
            <ul className="inventory-premium-list">
              <li>Selection-driven dark workspace for dense stock operations</li>
              <li>Advanced valuation, scoped movement, and alert views</li>
              <li>Premium page treatment shared across future advanced admin surfaces</li>
            </ul>
          </div>
          <div className="inventory-premium-feature">
            <div className="inventory-section-heading">Current access model</div>
            <ul className="inventory-premium-list">
              <li>Light stays available for low-plan workflows</li>
              <li>Platinum is treated as the premium add-on tier</li>
              <li>Until billing entitlements are wired, access is limited to higher-permission admin roles</li>
            </ul>
          </div>
        </div>

        <div className="inventory-premium-actions">
          <Button onClick={onOpenLightWorkspace}>Open Inventory Light</Button>
          <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Review plan details
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const isDark = usePrefersDark();
  const [location, setLocation] = useLocation();
  const pathname = location.split("?")[0];
  const routeMode = getInventoryWorkspaceMode(pathname);
  const canOpenPlatinum = canAccessInventoryPlatinum(user?.role);
  const mode = routeMode ?? (canOpenPlatinum ? "platinum" : "light");
  const inventoryBasePath = mode === "light" ? "/admin/inventory/light" : "/admin/inventory/platinum";

  const [section, setSection] = useState<InventorySection>(() => getSectionFromUrl());
  const [detailTab, setDetailTab] = useState<DetailTab>(() => getActivityScopeDefault(getSectionFromUrl()));
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [chipFilter, setChipFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockInInitialId, setStockInInitialId] = useState<string | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchDraft, setBatchDraft] = useState<Record<string, number>>({});
  const [stagedAction, setStagedAction] = useState<StagedAction>(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activitySort, setActivitySort] = useState<"newest" | "oldest">("newest");
  const [activityFilter, setActivityFilter] = useState<"all" | "stock_in" | "stock_out" | "transfer">("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (pathname !== "/admin/inventory") return;
    setLocation(canOpenPlatinum ? "/admin/inventory/platinum" : "/admin/inventory/light", { replace: true });
  }, [canOpenPlatinum, pathname, setLocation]);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextSection = getSectionFromUrl();
      setSection(nextSection);
      setDetailTab(getActivityScopeDefault(nextSection));
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const { data: summary = EMPTY_SUMMARY as InventorySummary, isLoading: summaryLoading } = useQuery<InventorySummary>({
    queryKey: ["inventory-summary"],
    queryFn: () => fetchJson<InventorySummary>("/api/admin/inventory/summary"),
    staleTime: 30_000,
  });

  const inventoryQuery = useQuery<InventoryListItem[]>({
    queryKey: ["inventory-products-v3", selectedOutlet],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOutlet !== "all") params.set("outlet", selectedOutlet);
      return fetchJson<InventoryListItem[]>(`/api/admin/inventory/products?${params.toString()}`);
    },
    staleTime: 30_000,
  });

  const movementsQuery = useQuery<InventoryMovement[]>({
    queryKey: ["inventory-movements-v2", selectedOutlet],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOutlet !== "all") params.set("outlet", selectedOutlet);
      return fetchJson<InventoryMovement[]>(`/api/admin/inventory/movements?${params.toString()}`);
    },
    staleTime: 30_000,
  });

  const inventoryItems = inventoryQuery.data ?? [];
  const movements = movementsQuery.data ?? [];

  const outlets = useMemo(
    () => Array.from(new Set(inventoryItems.map((item) => item.outlet))).sort((a, b) => a.localeCompare(b)),
    [inventoryItems],
  );

  const chipOptions = useMemo(() => {
    const categories = Array.from(new Set(inventoryItems.map((item) => item.category).filter(Boolean))).slice(0, 2);
    return ["all", ...categories, "low"];
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (section === "alerts" && item.status === "in_stock") return false;
      if (chipFilter === "low" && item.status === "in_stock") return false;
      if (chipFilter !== "all" && chipFilter !== "low" && item.category !== chipFilter) return false;
      if (!searchTerm) return true;
      return [item.name, item.variant, item.sku, item.channel, item.category]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(searchTerm));
    });
  }, [chipFilter, inventoryItems, searchTerm, section]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedItemId(null);
      return;
    }

    if (!selectedItemId || !filteredItems.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(filteredItems[0].id);
    }
  }, [filteredItems, selectedItemId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? null;
  const batchItems = useMemo(
    () => inventoryItems.filter((item) => item.productId === selectedItem?.productId),
    [inventoryItems, selectedItem?.productId],
  );

  useEffect(() => {
    if (!batchDialogOpen) return;
    setBatchDraft(Object.fromEntries(batchItems.map((item) => [item.id, item.currentQty])));
  }, [batchDialogOpen, batchItems]);

  const detailQuery = useQuery<InventoryProductDetail>({
    queryKey: ["inventory-product-detail", selectedItem?.productId, selectedItem?.variantId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedItem?.variantId != null) params.set("variantId", String(selectedItem.variantId));
      return fetchJson<InventoryProductDetail>(
        `/api/admin/inventory/products/${selectedItem?.productId}/detail?${params.toString()}`,
      );
    },
    enabled: !!selectedItem,
    staleTime: 30_000,
  });

  const detail = selectedItem ? detailQuery.data ?? buildDetailsFallback(selectedItem) : null;
  const detailPanels = selectedItem && detail ? PlatinumItemDetails({ detail, selectedItem }) : null;

  const activityEntries = useMemo(() => {
    const base = detail?.activity ?? [];
    const filtered = activityFilter === "all" ? base : base.filter((entry) => entry.movementType === activityFilter);
    return [...filtered].sort((left, right) => {
      const delta = new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
      return activitySort === "newest" ? delta * -1 : delta;
    });
  }, [activityFilter, activitySort, detail?.activity]);

  const stockInMutation = useMutation({
    mutationFn: async (selections: StockInSelection[]) => {
      const response = await fetch("/api/admin/inventory/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: selections.map((selection) => ({
            productId: selection.productId,
            variantId: selection.variantId,
            quantity: selection.qty,
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to stock in products");
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-products-v3"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-product-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-movements-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
      toast({
        title: "Stock added",
        description: "Inventory counts and movement history are refreshed.",
      });
      setStockInOpen(false);
      setStockInInitialId(null);
    },
    onError: () => {
      toast({
        title: "Stock in failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({
      productId,
      variantId,
      newStock,
    }: {
      productId: string;
      variantId: number | null;
      newStock: number;
    }) => {
      const response = await fetch(`/api/admin/inventory/${productId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ variantId, newStock }),
      });
      if (!response.ok) throw new Error("Failed to update stock");
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-products-v3"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-product-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-movements-v2"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]);
    },
  });

  const handleSectionChange = (nextSection: InventorySection) => {
    setSection(nextSection);
    setDetailTab(getActivityScopeDefault(nextSection));

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const nextQueryValue = SECTION_QUERY_MAP[nextSection];
    if (!nextQueryValue) params.delete("tab");
    else params.set("tab", nextQueryValue);
    const query = params.toString();
    setLocation(`${inventoryBasePath}${query ? `?${query}` : ""}`);
    window.dispatchEvent(new CustomEvent("admin-inventory-tab-change", { detail: { tab: nextQueryValue ?? "all" } }));
  };

  const openStagedAction = (type: "import" | "bulk_order" | "new_invoice" | "billing") => {
    switch (type) {
      case "import":
        setStagedAction({
          title: "Import is still routed through Products",
          description: "Platinum keeps the inventory action visible, but the live import workflow still belongs to Products until the inventory-native modal is built.",
          ctaLabel: "Open Products",
          ctaHref: "/admin/products",
        });
        break;
      case "bulk_order":
        setStagedAction({
          title: "Bulk order is staged",
          description: "This version keeps the visual action, but bulk ordering is not yet a real backend workflow in inventory. Use stock intake and stock adjustments for live operations.",
          ctaLabel: "Open stock in",
          openStockIn: true,
        });
        break;
      case "new_invoice":
        setStagedAction({
          title: "Invoice creation is handled in Orders",
          description: "The visual action remains visible for continuity, but billing and invoice generation still live in the Orders area.",
          ctaLabel: "Open Orders",
          ctaHref: "/admin/orders",
        });
        break;
      case "billing":
        setStagedAction({
          title: "Billing section is staged",
          description: "Inventory surfaces billing as a destination, but the actual billing workflow remains in Orders and Bills for now.",
          ctaLabel: "Open Orders",
          ctaHref: "/admin/orders",
        });
        break;
    }
  };

  const saveBatchChanges = async () => {
    for (const item of batchItems) {
      const nextQty = Math.max(0, batchDraft[item.id] ?? item.currentQty);
      if (nextQty === item.currentQty) continue;
      await updateStockMutation.mutateAsync({
        productId: item.productId,
        variantId: item.variantId,
        newStock: nextQty,
      });
    }

    toast({
      title: "Stock updated",
      description: "Variant quantities were refreshed.",
    });
    setBatchDialogOpen(false);
  };

  const platinumKpis: InventoryKpiCard[] = [
    { label: "Items", value: summary.totalProducts, helper: `${summary.totalSkus} live SKUs` },
    { label: "Stock value", value: formatNpr(summary.totalInventoryValue), helper: `${summary.totalQuantity} units in stock`, tone: "inventory-text-amber" },
    { label: "Low stock", value: summary.lowStockCount, helper: "Needs reorder attention", tone: "inventory-text-red" },
    { label: "Out of stock", value: summary.criticalStockCount, helper: "Immediate recovery candidates", tone: "inventory-text-red" },
    { label: "Active outlets", value: summary.outletCount, helper: `${summary.inStockCount} healthy items`, tone: "inventory-text-green" },
  ];

  return (
    <div className={cn("inventory-page-shell space-y-5", mode === "platinum" ? "inventory-page-shell--platinum" : "inventory-page-shell--light")}>
      {mode === "light" ? (
        <InventoryLightView
          summary={summary}
          summaryLoading={summaryLoading}
          items={filteredItems}
          selectedItem={selectedItem}
          detail={detail}
          movements={movements}
          selectedOutlet={selectedOutlet}
          outlets={outlets}
          onOutletChange={setSelectedOutlet}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          chipFilter={chipFilter}
          onChipFilterChange={setChipFilter}
          chipOptions={chipOptions}
          onSelectItem={setSelectedItemId}
          onOpenProductDialog={(item) => {
            setSelectedItemId(item.id);
            setProductDialogOpen(true);
          }}
          onOpenStockIn={(item) => {
            setStockInInitialId(item?.id ?? null);
            setStockInOpen(true);
          }}
          onOpenBatches={() => setBatchDialogOpen(true)}
          canOpenPlatinum={canOpenPlatinum}
          onOpenLightWorkspace={() => setLocation("/admin/inventory/light")}
          onOpenPlatinumWorkspace={() => setLocation("/admin/inventory/platinum")}
        />
      ) : !canOpenPlatinum ? (
        <InventoryPlatinumUpgrade onOpenLightWorkspace={() => setLocation("/admin/inventory/light")} />
      ) : (
        <div className="space-y-4">
          <section className="inventory-workspace-header inventory-workspace-header--platinum">
            <div className="inventory-workspace-copy">
              <div className="inventory-workspace-kicker">Premium workspace</div>
              <div className="inventory-workspace-title-row">
                <h1 className="inventory-page-title">Inventory Platinum</h1>
                <Badge className="inventory-premium-badge">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Rs {INVENTORY_PLATINUM_MONTHLY_PRICE} / month
                </Badge>
              </div>
              <p className="inventory-page-copy">
                Designed for premium operators who need a denser control room for stock health, scoped movement, and valuation.
              </p>
            </div>
            <div className="inventory-workspace-switcher">
              <Button variant="outline" className="inventory-workspace-switcher-btn" onClick={() => setLocation("/admin/inventory/light")}>
                Inventory Light
              </Button>
              <Button variant="outline" className="inventory-workspace-switcher-btn is-active" onClick={() => setLocation("/admin/inventory/platinum")}>
                Inventory Platinum
              </Button>
            </div>
          </section>

          <div className="inventory-workspace" data-theme={isDark ? "dark" : "light"}>
          <div className="inventory-shell inventory-shell--platinum">
            <aside className="inventory-nav-panel inventory-nav-panel--platinum">
              <div className="inventory-nav-head inventory-nav-head--platinum">
                <div className="inventory-store-chip">
                  <span className="inventory-store-dot">B</span>
                  <span className="text-xs font-medium">BN – CNY</span>
                  <span className="ml-auto text-[10px] text-[var(--inv-tx3)]">▾</span>
                </div>
              </div>

              <div className="inventory-nav-scroll">
                <div className="inventory-nav-label">Inventory</div>
                {[
                  { key: "all_items", label: "All items", icon: Boxes },
                  { key: "bulk_operations", label: "Bulk operations", icon: ShoppingCart },
                  { key: "billing", label: "Billing", icon: FileSpreadsheet },
                  { key: "alerts", label: "Low stock alerts", icon: TriangleAlert, badge: summary.lowStockCount > 0 ? String(summary.lowStockCount) : undefined },
                  { key: "valuation", label: "Stock valuation", icon: ChartColumnBig },
                  { key: "movements", label: "Stock movement", icon: ArrowUpToLine },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={cn("inventory-nav-item", section === item.key && "is-active")}
                      onClick={() => handleSectionChange(item.key as InventorySection)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                      {item.badge ? <span className="inventory-nav-badge">{item.badge}</span> : null}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="inventory-main">
              <div className="inventory-platinum-topbar">
                <div className="inventory-topbar">
                  <span className="inventory-topbar-title">Inventory</span>
                  <span className="inventory-topbar-sep">/</span>
                  <span className="inventory-topbar-sub">{SECTION_LABELS[section]}</span>
                </div>
                <div className="inventory-topbar-actions">
                  <button type="button" className="inventory-btn" onClick={() => openStagedAction("import")}>
                    <ArrowDownToLine className="h-3.5 w-3.5" />
                    Import
                  </button>
                  <button type="button" className="inventory-btn" onClick={() => exportInventoryCsv(filteredItems)}>
                    <ArrowUpToLine className="h-3.5 w-3.5" />
                    Export
                  </button>
                  <button type="button" className="inventory-btn inventory-btn--success" onClick={() => openStagedAction("bulk_order")}>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Bulk order
                  </button>
                  <button type="button" className="inventory-btn inventory-btn--accent" onClick={() => setLocation("/admin/products/new")}>
                    + Add item
                  </button>
                </div>
              </div>

              <div className="inventory-kpi-bar inventory-kpi-bar--platinum">
                {summaryLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="inventory-kpi-card inventory-kpi-card--platinum">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="mt-3 h-5 w-20" />
                        <Skeleton className="mt-2 h-3 w-24" />
                      </div>
                    ))
                  : platinumKpis.map((card) => (
                      <div key={card.label} className="inventory-kpi-card inventory-kpi-card--platinum">
                        <div className="inventory-kpi-label">{card.label}</div>
                        <div className={cn("inventory-kpi-value", card.tone)}>{card.value}</div>
                        <div className="inventory-kpi-meta">{card.helper}</div>
                      </div>
                    ))}
              </div>

              <div className="inventory-content inventory-content--platinum">
                <div className="inventory-items-panel inventory-items-panel--platinum">
                  <div className="inventory-items-head">
                    <div className="inventory-items-row">
                      <div>
                        <div className="inventory-items-title">
                          Items <span className="inventory-muted-copy">({filteredItems.length})</span>
                        </div>
                        <div className="inventory-items-subcopy">Search, filter, and inspect without leaving the workspace.</div>
                      </div>
                      <Button size="sm" onClick={() => setLocation("/admin/products/new")}>
                        + Add
                      </Button>
                    </div>
                  </div>

                  <div className="inventory-search-wrap">
                    <Search className="inventory-search-icon h-3.5 w-3.5" />
                    <input
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search items..."
                      className="inventory-search-input"
                    />
                  </div>

                  <div className="inventory-chip-row">
                    <ToggleGroup
                      type="single"
                      value={chipFilter}
                      onValueChange={(value) => value && setChipFilter(value)}
                      variant="outline"
                      className="inventory-chip-toggle"
                    >
                      {chipOptions.map((chip) => (
                        <ToggleGroupItem key={chip} value={chip} className="inventory-chip-toggle-item">
                          {chip === "all" ? "All" : chip === "low" ? "Low" : chip}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <div className="inventory-item-scroll">
                    {inventoryQuery.isLoading ? (
                      Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="border-b border-[var(--inv-bd)] px-[10px] py-[10px]">
                          <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                      ))
                    ) : filteredItems.length ? (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={cn("inventory-item-row inventory-item-row--platinum", selectedItem?.id === item.id && "is-selected")}
                          onClick={() => setSelectedItemId(item.id)}
                        >
                          <div className={cn("inventory-item-avatar", item.status === "in_stock" ? "inventory-avatar--accent" : "inventory-avatar--blue")}>
                            {getAvatarLabel(item)}
                          </div>
                          <div className="inventory-item-info">
                            <div className="inventory-item-name">{item.name}</div>
                            <div className="inventory-item-meta">{item.variant}</div>
                          </div>
                          <div className={cn("inventory-item-qty", getQuantityTone(item.status))}>{item.units}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4">
                        <InventoryEmpty
                          icon={Search}
                          title="No items in this filter"
                          description="Clear the search or switch the chip filter to bring inventory back into scope."
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="inventory-detail-panel inventory-detail-panel--platinum">
                  {selectedItem ? (
                    <>
                      <div className="inventory-detail-head inventory-detail-head--platinum">
                        <div className="inventory-detail-title-row">
                          <div className="inventory-detail-avatar">{getAvatarLabel(selectedItem)}</div>
                          <div className="min-w-0">
                            <div className="inventory-detail-name">{selectedItem.name}</div>
                            <div className="inventory-detail-sub">
                              {selectedItem.variant} · Code: {detail?.productCode || selectedItem.sku}
                            </div>
                          </div>
                          <div className="inventory-detail-actions">
                            <button type="button" className="inventory-btn inventory-btn--success" onClick={() => setBatchDialogOpen(true)}>
                              Adjust stock
                            </button>
                            <button type="button" className="inventory-btn inventory-btn--accent" onClick={() => openStagedAction("new_invoice")}>
                              New invoice
                            </button>
                            <button type="button" className="inventory-btn" onClick={() => openStagedAction("billing")}>
                              <Ellipsis className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="inventory-detail-metrics inventory-detail-metrics--platinum">
                          <div className="inventory-detail-metric">
                            <div className="inventory-detail-metric-label">Stock qty</div>
                            <div className={cn("inventory-detail-metric-value", selectedItem.status === "in_stock" ? "inventory-text-green" : selectedItem.status === "low_stock" ? "inventory-text-amber" : "inventory-text-red")}>
                              {selectedItem.units}
                            </div>
                          </div>
                          <div className="inventory-detail-metric">
                            <div className="inventory-detail-metric-label">Sales price</div>
                            <div className="inventory-detail-metric-value">{formatNpr(selectedItem.sellingPrice)}</div>
                          </div>
                          <div className="inventory-detail-metric">
                            <div className="inventory-detail-metric-label">Purchase price</div>
                            <div className="inventory-detail-metric-value">{formatNpr(selectedItem.costPrice)}</div>
                          </div>
                          <div className="inventory-detail-metric">
                            <div className="inventory-detail-metric-label">Stock value</div>
                            <div className="inventory-detail-metric-value">{formatNpr(selectedItem.totalValue)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="inventory-detail-body inventory-detail-body--platinum">
                        {section === "billing" ? (
                          <div className="inventory-stage-panel">
                            <div className="inventory-stage-title">Billing is staged from inventory</div>
                            <p className="inventory-stage-copy">
                              Inventory Platinum surfaces billing as a destination, but the real billing workflow remains in Orders and Bills.
                            </p>
                            <div className="mt-4 flex gap-2">
                              <Button onClick={() => setLocation("/admin/orders")}>Open Orders</Button>
                              <Button variant="outline" onClick={() => handleSectionChange("all_items")}>Back to inventory</Button>
                            </div>
                          </div>
                        ) : section === "bulk_operations" ? (
                          <div className="inventory-stage-panel">
                            <div className="inventory-stage-title">Bulk operations are staged</div>
                            <p className="inventory-stage-copy">
                              Platinum keeps the dedicated section visible, but the real live operations in this pass are stock intake and stock adjustment.
                            </p>
                            <div className="mt-4 flex gap-2">
                              <Button onClick={() => { setStockInInitialId(selectedItem.id); setStockInOpen(true); }}>Open stock in</Button>
                              <Button variant="outline" onClick={() => setLocation("/admin/products")}>Open Products</Button>
                            </div>
                          </div>
                        ) : (
                          <Tabs value={detailTab} onValueChange={(value) => setDetailTab(value as DetailTab)} className="space-y-4">
                            <TabsList className="inventory-tabs-list">
                              {(["activity", "details", "valuation", "movement", "alerts"] as DetailTab[]).map((tab) => (
                                <TabsTrigger key={tab} value={tab} className="inventory-tabs-trigger">
                                  {DETAIL_TAB_LABELS[tab]}
                                </TabsTrigger>
                              ))}
                            </TabsList>

                            <TabsContent value="activity" className="space-y-3">
                              <div className="inventory-section-header">
                                <div>
                                  <div className="inventory-section-title">Item activity ({activityEntries.length})</div>
                                  <div className="inventory-muted-copy">Product-scoped movement and sales history.</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setActivitySort((current) => (current === "newest" ? "oldest" : "newest"))}
                                  >
                                    Sort {activitySort === "newest" ? "Newest" : "Oldest"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setActivityFilter((current) =>
                                        current === "all" ? "stock_out" : current === "stock_out" ? "stock_in" : current === "stock_in" ? "transfer" : "all",
                                      )
                                    }
                                  >
                                    Filter {activityFilter === "all" ? "All" : getMovementTypeLabel(activityFilter)}
                                  </Button>
                                </div>
                              </div>
                              <table className="inventory-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: "28%" }}>Type</th>
                                    <th style={{ width: "16%" }}>Date</th>
                                    <th style={{ width: "12%" }}>Change</th>
                                    <th style={{ width: "12%" }}>Qty</th>
                                    <th>Remarks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailQuery.isLoading ? (
                                    Array.from({ length: 4 }).map((_, index) => (
                                      <tr key={index}>
                                        <td><Skeleton className="h-4 w-32" /></td>
                                        <td><Skeleton className="h-4 w-20" /></td>
                                        <td><Skeleton className="h-4 w-12" /></td>
                                        <td><Skeleton className="h-4 w-10" /></td>
                                        <td><Skeleton className="h-4 w-48" /></td>
                                      </tr>
                                    ))
                                  ) : activityEntries.length ? (
                                    activityEntries.map((entry) => (
                                      <tr key={entry.id}>
                                        <td>
                                          <div className="font-medium">{entry.title}</div>
                                          <div className="inventory-muted-copy">{entry.subtitle}</div>
                                        </td>
                                        <td className="inventory-muted-copy">
                                          {formatMovementDate(entry.occurredAt)}
                                          <div>{formatMovementTime(entry.occurredAt)}</div>
                                        </td>
                                        <td className={entry.delta < 0 ? "inventory-text-red font-semibold" : "inventory-text-green font-semibold"}>
                                          {entry.delta > 0 ? "+" : ""}
                                          {entry.delta}
                                        </td>
                                        <td><span className={getActivityBadgeClass(entry)}>{entry.quantity}</span></td>
                                        <td className="inventory-muted-copy">{entry.remarks}</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={5} className="p-6">
                                        <InventoryEmpty
                                          icon={ChartColumnBig}
                                          title="No scoped activity yet"
                                          description="This item has not recorded product-scoped activity in the inventory timeline yet."
                                        />
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </TabsContent>

                            <TabsContent value="details">{detailPanels?.details}</TabsContent>
                            <TabsContent value="valuation">{detailPanels?.valuation}</TabsContent>
                            <TabsContent value="movement">{detailPanels?.movement}</TabsContent>
                            <TabsContent value="alerts">{detailPanels?.alerts}</TabsContent>
                          </Tabs>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="inventory-detail-body inventory-detail-body--platinum">
                      <InventoryEmpty
                        icon={Boxes}
                        title="No item selected"
                        description="Pick an inventory row from the left panel to inspect stock, pricing, valuation, and activity."
                      />
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
          </div>
        </div>
      )}

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="border-[var(--inv-bd2)] bg-[#1a1a1a] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Review and update the live stock quantity for each variant in this item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {batchItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#2e2e2e] bg-[#222222] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.variant}</p>
                  <p className="mt-1 text-xs text-neutral-400">{item.sku} · {getStatusLabel(item.status)}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={batchDraft[item.id] ?? item.currentQty}
                  onChange={(event) =>
                    setBatchDraft((current) => ({
                      ...current,
                      [item.id]: Math.max(0, Number(event.target.value) || 0),
                    }))
                  }
                  className="h-9 w-24 border-[#3a3a3a] bg-[#111111] text-center text-sm font-semibold text-white"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Close
            </Button>
            <Button
              className="border-0 bg-[#6366f1] text-white hover:bg-[#818cf8]"
              disabled={updateStockMutation.isPending}
              onClick={saveBatchChanges}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stagedAction} onOpenChange={(open) => !open && setStagedAction(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{stagedAction?.title}</DialogTitle>
            <DialogDescription>{stagedAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStagedAction(null)}>
              Close
            </Button>
            {stagedAction?.ctaHref ? (
              <Button
                onClick={() => {
                  setStagedAction(null);
                  setLocation(stagedAction.ctaHref!);
                }}
              >
                {stagedAction.ctaLabel}
              </Button>
            ) : stagedAction?.openStockIn ? (
              <Button
                onClick={() => {
                  setStagedAction(null);
                  setStockInInitialId(selectedItem?.id ?? null);
                  setStockInOpen(true);
                }}
              >
                {stagedAction.ctaLabel}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LightProductDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        selectedItem={selectedItem}
        allVariants={batchItems}
        detail={detail}
        isPending={stockInMutation.isPending}
        onConfirm={(selections) => stockInMutation.mutate(selections)}
      />

      <StockInSheet
        isOpen={stockInOpen}
        products={inventoryItems}
        initialProductId={stockInInitialId}
        defaultLowStockFirst
        onClose={() => {
          if (stockInMutation.isPending) return;
          setStockInOpen(false);
          setStockInInitialId(null);
        }}
        onConfirm={(selections) => stockInMutation.mutate(selections)}
      />
    </div>
  );
}
