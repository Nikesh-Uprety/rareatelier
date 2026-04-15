import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, PackageSearch, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCategories, type ProductApi } from "@/lib/api";
import {
  createAdminOrder,
  fetchAdminProductsPage,
  type AdminCreateOrderInput,
} from "@/lib/adminApi";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type OrderItemDraft = {
  productId: string;
  color?: string;
  size?: string;
  quantity: number;
  priceAtTime: number;
};

type ProductStatusFilter = "all" | "active" | "draft";
type InventoryFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
type ProductSortOption = "name_asc" | "price_low_high" | "price_high_low" | "stock_high_low";

function parseJsonArray(input: string | null | undefined): string[] {
  if (!input) return [];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function getProductPreviewImage(product: ProductApi): string {
  const gallery = parseJsonArray(product.galleryUrls);
  return product.imageUrl || gallery[0] || "/placeholder.png";
}

function getInventoryMeta(stock: number) {
  if (stock <= 0) {
    return {
      label: "Out of stock",
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
    };
  }

  if (stock <= 5) {
    return {
      label: `Low stock · ${stock}`,
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
    };
  }

  return {
    label: `${stock} in stock`,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  };
}

function matchesInventoryFilter(product: ProductApi, inventoryFilter: InventoryFilter) {
  if (inventoryFilter === "in_stock") return product.stock > 5;
  if (inventoryFilter === "low_stock") return product.stock > 0 && product.stock <= 5;
  if (inventoryFilter === "out_of_stock") return product.stock <= 0;
  return true;
}

function sortProducts(products: ProductApi[], sortOption: ProductSortOption) {
  const sorted = [...products];
  sorted.sort((a, b) => {
    if (sortOption === "price_low_high") return Number(a.price ?? 0) - Number(b.price ?? 0);
    if (sortOption === "price_high_low") return Number(b.price ?? 0) - Number(a.price ?? 0);
    if (sortOption === "stock_high_low") return Number(b.stock ?? 0) - Number(a.stock ?? 0);
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

export default function AdminOrdersNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const productBrowserRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<OrderItemDraft[]>([
    { productId: "", quantity: 1, priceAtTime: 0 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [status, setStatus] = useState<AdminCreateOrderInput["status"]>("pending");
  const [deliveryFee, setDeliveryFee] = useState(100);
  const [customerName, setCustomerName] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState<ProductStatusFilter>("active");
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
  const [sortOption, setSortOption] = useState<ProductSortOption>("name_asc");
  const [pickerItemIndex, setPickerItemIndex] = useState<number | null>(0);
  const [shipping, setShipping] = useState({
    email: "",
    phone: "",
    deliveryLocation: "",
  });
  const [productCache, setProductCache] = useState<Record<string, ProductApi>>({});

  const deferredProductSearch = useDeferredValue(productSearch.trim().toLowerCase());

  const { data: categories = [] } = useQuery({
    queryKey: ["admin", "orders", "categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const { data: productLibraryData, isPending: productsPending, isFetching: productsFetching } = useQuery({
    queryKey: ["admin", "orders", "product-library", productCategoryFilter, productStatusFilter],
    queryFn: () =>
      fetchAdminProductsPage({
        category: productCategoryFilter === "all" ? undefined : productCategoryFilter,
        status: productStatusFilter === "all" ? undefined : productStatusFilter,
        page: 1,
        limit: 500,
      }),
    staleTime: 60_000,
  });

  const libraryProducts = productLibraryData?.data ?? [];

  useEffect(() => {
    if (!libraryProducts.length) return;
    setProductCache((prev) => {
      const next = { ...prev };
      for (const product of libraryProducts) {
        next[product.id] = product;
      }
      return next;
    });
  }, [libraryProducts]);

  const categoryNameBySlug = useMemo(
    () => new Map(categories.map((category) => [category.slug, category.name])),
    [categories],
  );

  const productById = useMemo(
    () => new Map(Object.values(productCache).map((product) => [product.id, product])),
    [productCache],
  );

  const selectedProductQuantities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (!item.productId) continue;
      counts.set(item.productId, (counts.get(item.productId) ?? 0) + item.quantity);
    }
    return counts;
  }, [items]);

  const visibleLibraryProducts = useMemo(() => {
    const filteredBySearch = deferredProductSearch
      ? libraryProducts.filter((product) => {
          const tokens = [
            product.name,
            product.shortDetails,
            categoryNameBySlug.get(product.category ?? "") ?? product.category ?? "",
            ...parseJsonArray(product.colorOptions),
            ...parseJsonArray(product.sizeOptions),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return tokens.includes(deferredProductSearch);
        })
      : libraryProducts;

    return sortProducts(
      filteredBySearch.filter((product) => matchesInventoryFilter(product, inventoryFilter)),
      sortOption,
    );
  }, [categoryNameBySlug, deferredProductSearch, inventoryFilter, libraryProducts, sortOption]);

  const subtotal = items.reduce((sum, item) => sum + item.priceAtTime * item.quantity, 0);
  const orderTotal = Math.max(0, subtotal + deliveryFee);

  const focusProductBrowser = () => {
    productBrowserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateItem = (index: number, patch: Partial<OrderItemDraft>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const buildProductDraft = (product: ProductApi): Pick<OrderItemDraft, "productId" | "color" | "size" | "priceAtTime"> => {
    const availableColors = parseJsonArray(product.colorOptions);
    const availableSizes = parseJsonArray(product.sizeOptions);
    return {
      productId: product.id,
      priceAtTime: Number(product.price ?? 0),
      color: availableColors.length === 1 ? availableColors[0] : "",
      size: availableSizes.length === 1 ? availableSizes[0] : "",
    };
  };

  const assignProductToRow = (index: number, product: ProductApi) => {
    updateItem(index, buildProductDraft(product));
    setPickerItemIndex(null);
  };

  const addProductFromLibrary = (product: ProductApi) => {
    if (pickerItemIndex !== null && items[pickerItemIndex]) {
      assignProductToRow(pickerItemIndex, product);
      return;
    }

    const emptyIndex = items.findIndex((item) => !item.productId);
    if (emptyIndex >= 0) {
      assignProductToRow(emptyIndex, product);
      return;
    }

    setItems((prev) => [...prev, { ...buildProductDraft(product), quantity: 1 }]);
  };

  const addRow = () => {
    const nextIndex = items.length;
    setItems((prev) => [...prev, { productId: "", quantity: 1, priceAtTime: 0 }]);
    setPickerItemIndex(nextIndex);
    requestAnimationFrame(() => {
      focusProductBrowser();
    });
  };

  const beginProductPick = (index: number) => {
    setPickerItemIndex(index);
    focusProductBrowser();
  };

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setPickerItemIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const clearCatalogFilters = () => {
    setProductSearch("");
    setProductCategoryFilter("all");
    setProductStatusFilter("active");
    setInventoryFilter("all");
    setSortOption("name_asc");
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminCreateOrderInput) => createAdminOrder(payload),
    onSuccess: (data) => {
      toast({
        title: "Order created",
        description: data?.orderNumber ? `Order ${data.orderNumber} is ready.` : "Order created successfully.",
      });
      setLocation("/admin/orders");
    },
    onError: (error) => {
      toast({
        title: "Failed to create order",
        description: getErrorMessage(error, "Please review the order details and try again."),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const filteredItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 1,
        priceAtTime: Number(item.priceAtTime) || 0,
      }));

    if (!filteredItems.length) {
      toast({ title: "Add at least one product", variant: "destructive" });
      return;
    }

    const fullName = customerName.trim();
    const [firstName = "", ...lastParts] = fullName.split(/\s+/).filter(Boolean);
    const lastName = lastParts.join(" ");

    mutation.mutate({
      items: filteredItems,
      shipping: {
        fullName: fullName || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: shipping.email || undefined,
        phone: shipping.phone || undefined,
        deliveryLocation: shipping.deliveryLocation || undefined,
      },
      paymentMethod,
      deliveryFee,
      source: "admin",
      status: status || undefined,
    });
  };

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
          Create Order
        </h1>
        <p className="text-muted-foreground">
          Search the catalog visually, add the right products fast, then finish the order with only the essential customer details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  <PackageSearch className="h-4 w-4" />
                  Add Products
                </div>
                <h2 className="text-xl font-semibold text-foreground">Browse the catalog and build the order</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Use search, category, stock state, and sorting to narrow the catalog quickly. Each result includes the product image so the team can add the right item with confidence.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="mr-2 h-4 w-4" /> Add empty line
              </Button>
            </div>

            <div
              ref={productBrowserRef}
              className="mt-6 rounded-[24px] border border-border/70 bg-[#FBFBF8] p-4 dark:bg-muted/20"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_180px] xl:items-end">
                  <div className="space-y-1 md:col-span-2 xl:col-span-1">
                    <label htmlFor="admin-order-product-search" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Search products
                    </label>
                    <div className="flex h-11 items-center rounded-2xl border border-border bg-background px-3 shadow-sm transition-colors focus-within:border-[#2C3E2D]/40">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="admin-order-product-search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search by product, color, size, or category"
                        className="h-full border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
                      />
                      {productSearch ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={() => setProductSearch("")}
                          aria-label="Clear product search"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Category
                    </label>
                    <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.slug}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Catalog state
                    </label>
                    <Select value={productStatusFilter} onValueChange={(value) => setProductStatusFilter(value as ProductStatusFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Active products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="all">All visible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Inventory
                    </label>
                    <Select value={inventoryFilter} onValueChange={(value) => setInventoryFilter(value as InventoryFilter)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All stock states" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All stock states</SelectItem>
                        <SelectItem value="in_stock">In stock</SelectItem>
                        <SelectItem value="low_stock">Low stock</SelectItem>
                        <SelectItem value="out_of_stock">Out of stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[180px_auto] xl:min-w-[320px] xl:max-w-[360px] xl:flex-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Sort by
                    </label>
                    <Select value={sortOption} onValueChange={(value) => setSortOption(value as ProductSortOption)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort products" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name_asc">Name A-Z</SelectItem>
                        <SelectItem value="price_low_high">Price low to high</SelectItem>
                        <SelectItem value="price_high_low">Price high to low</SelectItem>
                        <SelectItem value="stock_high_low">Stock high to low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={clearCatalogFilters}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" /> Reset filters
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full border-[#D7E2D7] bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:bg-background/40">
                  {visibleLibraryProducts.length} matches
                </Badge>
                <Badge variant="outline" className="rounded-full border-[#D7E2D7] bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:bg-background/40">
                  {items.filter((item) => item.productId).length} lines in order
                </Badge>
                {productsFetching ? (
                  <Badge variant="outline" className="rounded-full border-[#D7E2D7] bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:bg-background/40">
                    Refreshing catalog…
                  </Badge>
                ) : null}
                {productLibraryData && productLibraryData.total > libraryProducts.length ? (
                  <Badge variant="outline" className="rounded-full border-[#D7E2D7] bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:bg-background/40">
                    Showing first {libraryProducts.length} of {productLibraryData.total}
                  </Badge>
                ) : null}
              </div>

              {pickerItemIndex !== null && items[pickerItemIndex] ? (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#D9E6D9] bg-white p-4 shadow-sm dark:border-[#2F4133] dark:bg-background/50 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#506451] dark:text-[#CFE0D1]">
                      Selecting for line item {pickerItemIndex + 1}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Choose a product below and it will be applied directly to that row.
                    </p>
                  </div>
                  <Button type="button" variant="ghost" className="justify-start md:justify-center" onClick={() => setPickerItemIndex(null)}>
                    Cancel targeted selection
                  </Button>
                </div>
              ) : null}

              <ScrollArea className="mt-4 h-[420px] pr-4">
                {productsPending ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 p-10 text-sm text-muted-foreground">
                    Loading catalog…
                  </div>
                ) : visibleLibraryProducts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 p-10 text-center">
                    <PackageSearch className="h-8 w-8 text-muted-foreground" />
                    <h3 className="mt-4 text-base font-semibold text-foreground">No products match the current filters</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Try a broader search, switch category, or reset the stock filters to bring more products back into view.
                    </p>
                    <Button type="button" variant="outline" className="mt-4" onClick={clearCatalogFilters}>
                      Reset catalog filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {visibleLibraryProducts.map((product) => {
                      const selectedQuantity = selectedProductQuantities.get(product.id) ?? 0;
                      const availableColors = parseJsonArray(product.colorOptions);
                      const availableSizes = parseJsonArray(product.sizeOptions);
                      const inventoryMeta = getInventoryMeta(product.stock);
                      const categoryLabel = categoryNameBySlug.get(product.category ?? "") ?? product.category ?? "General";

                      return (
                        <div
                          key={product.id}
                          className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-[#E1E9E1] bg-white p-3 shadow-[0_12px_30px_rgba(31,47,33,0.04)] transition-colors hover:border-[#C4D3C4] dark:border-[#2F4133] dark:bg-background/70 dark:hover:border-[#48604B]"
                        >
                          <div className="flex gap-3">
                            <img
                              src={getProductPreviewImage(product)}
                              alt={product.name}
                              className="h-20 w-20 rounded-xl object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{categoryLabel}</p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold text-foreground">{formatPrice(Number(product.price ?? 0))}</p>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", inventoryMeta.className)}>
                                  {inventoryMeta.label}
                                </span>
                                {availableColors.length ? (
                                  <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {availableColors.length} color{availableColors.length > 1 ? "s" : ""}
                                  </span>
                                ) : null}
                                {availableSizes.length ? (
                                  <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {availableSizes.length} size{availableSizes.length > 1 ? "s" : ""}
                                  </span>
                                ) : null}
                                {selectedQuantity > 0 ? (
                                  <span className="rounded-full border border-[#D8E5D8] bg-[#F4F9F4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#466048] dark:border-[#2E4732] dark:bg-[#18301D] dark:text-[#D8F0DC]">
                                    In order · {selectedQuantity}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                            <p className="text-xs text-muted-foreground">
                              {product.shortDetails?.trim() || "Ready to add with variants and custom pricing controls below."}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              className="shrink-0"
                              onClick={() => addProductFromLibrary(product)}
                            >
                              {pickerItemIndex !== null ? `Use for line ${pickerItemIndex + 1}` : selectedQuantity > 0 ? "Add again" : "Add to order"}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="mt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Order line items</h3>
                  <p className="text-sm text-muted-foreground">
                    Review quantity, variants, and pricing for each selected product before placing the order.
                  </p>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {items.filter((item) => item.productId).length} configured lines
                </p>
              </div>

              <div className="mt-4 space-y-4">
                {items.map((item, index) => {
                  const product = item.productId ? productById.get(item.productId) : null;
                  const availableColors = parseJsonArray(product?.colorOptions);
                  const availableSizes = parseJsonArray(product?.sizeOptions);
                  const categoryLabel = product
                    ? categoryNameBySlug.get(product.category ?? "") ?? product.category ?? "General"
                    : "";
                  const inventoryMeta = product ? getInventoryMeta(product.stock) : null;

                  return (
                    <div
                      key={`${item.productId || "empty"}-${index}`}
                      className={cn(
                        "rounded-2xl border border-border/70 bg-white p-4 shadow-sm transition-colors dark:bg-card",
                        pickerItemIndex === index && "border-[#2C3E2D]/30 bg-[#F7FBF7] dark:bg-[#162018]",
                      )}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex-1">
                          {product ? (
                            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-[#FBFBF8] p-3 dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex min-w-0 items-center gap-3">
                                <img
                                  src={getProductPreviewImage(product)}
                                  alt={product.name}
                                  className="h-16 w-16 rounded-xl object-cover"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                                    <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      {categoryLabel}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Base price {formatPrice(Number(product.price ?? 0))}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {inventoryMeta ? (
                                      <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", inventoryMeta.className)}>
                                        {inventoryMeta.label}
                                      </span>
                                    ) : null}
                                    {availableColors.length ? (
                                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                        {availableColors.length} color option{availableColors.length > 1 ? "s" : ""}
                                      </span>
                                    ) : null}
                                    {availableSizes.length ? (
                                      <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                        {availableSizes.length} size option{availableSizes.length > 1 ? "s" : ""}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={() => beginProductPick(index)}>
                                Change product
                              </Button>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-border/70 bg-[#FBFBF8] p-4 dark:bg-muted/20">
                              <p className="text-sm font-semibold text-foreground">Line item {index + 1} does not have a product yet.</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Pick a product from the catalog above to attach image, pricing, and variants to this row.
                              </p>
                              <Button type="button" className="mt-4" onClick={() => beginProductPick(index)}>
                                Select product from catalog
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeRow(index)}
                            disabled={items.length === 1}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_150px_120px_150px]">
                        <Select
                          value={item.color ?? ""}
                          onValueChange={(value) => updateItem(index, { color: value })}
                          disabled={!availableColors.length}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={availableColors.length ? "Select color" : "No colors"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map((color) => (
                              <SelectItem key={color} value={color}>
                                {color}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={item.size ?? ""}
                          onValueChange={(value) => updateItem(index, { size: value })}
                          disabled={!availableSizes.length}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={availableSizes.length ? "Select size" : "No sizes"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSizes.map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <PriceInput
                          aria-label="Item price"
                          min={0}
                          value={item.priceAtTime}
                          onChange={(val) => updateItem(index, { priceAtTime: val })}
                          placeholder="Price"
                          disabled={!product}
                        />

                        <Input
                          type="number"
                          min={1}
                          name={`items.${index}.quantity`}
                          inputMode="numeric"
                          autoComplete="off"
                          aria-label="Item quantity"
                          value={item.quantity}
                          disabled={!product}
                          onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        />

                        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Line total
                          </p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {formatPrice(item.priceAtTime * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Customer</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="order-customer-name" className="text-[11px] font-semibold text-muted-foreground">
                  Customer name
                </label>
                <Input
                  id="order-customer-name"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Customer name…"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="order-email" className="text-[11px] font-semibold text-muted-foreground">
                  Email
                </label>
                <Input
                  id="order-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Email…"
                  value={shipping.email}
                  onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="order-phone" className="text-[11px] font-semibold text-muted-foreground">
                  Phone
                </label>
                <Input
                  id="order-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Phone…"
                  value={shipping.phone}
                  onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="order-delivery-location" className="text-[11px] font-semibold text-muted-foreground">
                  Delivery location
                </label>
                <Input
                  id="order-delivery-location"
                  name="deliveryLocation"
                  autoComplete="off"
                  placeholder="Delivery location…"
                  value={shipping.deliveryLocation}
                  onChange={(e) => setShipping((s) => ({ ...s, deliveryLocation: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Payment</h2>
            <div className="mt-4 space-y-3">
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_on_delivery">Cash on delivery</SelectItem>
                  <SelectItem value="esewa">Esewa</SelectItem>
                  <SelectItem value="khalti">Khalti</SelectItem>
                  <SelectItem value="fonepay">Fonepay</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status ?? "pending"} onValueChange={(value) => setStatus(value as AdminCreateOrderInput["status"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1">
                <label htmlFor="order-delivery-fee" className="text-[11px] font-semibold text-muted-foreground">
                  Delivery charge
                </label>
                <PriceInput
                  aria-label="Delivery charge"
                  id="order-delivery-fee"
                  min={0}
                  value={deliveryFee}
                  onChange={(val) => setDeliveryFee(Math.max(0, val))}
                  placeholder="Delivery charge"
                />
              </div>
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Products subtotal</span>
                  <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Delivery charge</span>
                  <span className="font-medium text-foreground">{formatPrice(deliveryFee)}</span>
                </div>
                <div className="h-px bg-border/70" />
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Order total</p>
                  <p className="text-lg font-semibold text-foreground">{formatPrice(orderTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white/90 p-6 shadow-sm dark:bg-card">
            <Button
              type="button"
              className="w-full"
              loading={mutation.isPending}
              loadingText="Creating..."
              onClick={handleSubmit}
            >
              Create Order
            </Button>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setLocation("/admin/orders")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
