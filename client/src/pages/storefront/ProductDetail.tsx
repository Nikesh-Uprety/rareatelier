import { lazy, Suspense, useState, useMemo, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/store/cart";
import { useThemeStore } from "@/store/theme";
import { Button } from "@/components/ui/button";
import { ChevronDown, FileText, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchProductById, fetchProducts, fetchPageConfig, type ProductApi, type ProductSizeChart } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import { StorefrontSeo } from "@/components/seo/StorefrontSeo";
import ProductMediaStage from "@/components/product/ProductMediaStage";
const SizeFitGuide = lazy(() => import("@/components/product/SizeFitGuide"));

function parseJsonArray(s: string | null | undefined): string[] {
  if (!s || !s.trim()) return [];
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

const COLOR_NAME_SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f5",
  cream: "#f2eadf",
  ivory: "#fff8e7",
  beige: "#d8c3a5",
  tan: "#c19a6b",
  brown: "#7a5a43",
  mocha: "#7b5b45",
  chocolate: "#5d3a1a",
  camel: "#c19a6b",
  grey: "#7c7c7c",
  gray: "#7c7c7c",
  charcoal: "#36454f",
  silver: "#bfc5cc",
  blue: "#2548b1",
  navy: "#1f2a44",
  "navy blue": "#1f2a44",
  royal: "#4169e1",
  "royal blue": "#4169e1",
  sky: "#76b5ff",
  "sky blue": "#76b5ff",
  baby: "#a9d6ff",
  "baby blue": "#a9d6ff",
  teal: "#0f766e",
  turquoise: "#40e0d0",
  green: "#2f7d32",
  olive: "#556b2f",
  sage: "#9caf88",
  mint: "#98ff98",
  red: "#c62828",
  maroon: "#6b1f2a",
  burgundy: "#6d213c",
  wine: "#722f37",
  pink: "#f7a6ec",
  blush: "#e8b4b8",
  rose: "#e11d48",
  purple: "#7c3aed",
  lavender: "#b497d6",
  lilac: "#c8a2c8",
  yellow: "#facc15",
  mustard: "#d4a017",
  orange: "#f97316",
  gold: "#c9a84c",
};

function resolveNamedColorSwatch(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  return COLOR_NAME_SWATCHES[normalized] ?? null;
}

function parseColorOption(value: string): { label: string; swatch: string | null } {
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/);
  const label = trimmed
    .replace(/\(\s*#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\s*\)/g, "")
    .replace(/\|\s*#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})/g, "")
    .trim();

  return {
    label: label || trimmed,
    swatch: hexMatch?.[0] ?? resolveNamedColorSwatch(label || trimmed),
  };
}

function normalizeColorLabel(value: string | null | undefined): string {
  return parseColorOption(value ?? "").label.trim().toLowerCase();
}

function normalizeVariantId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }
  }
  return undefined;
}

const SHIRT_SIZE_CHART: ProductSizeChart = {
  image: "/images/sizecharts/shirt.svg",
  units: "cm",
  measureOverlay: {
    shoulder: { top: "11%", left: "20%", width: "60%" },
    chest: { top: "40%", left: "25%", width: "50%" },
    length: { top: "12%", left: "80%", height: "70%" },
    sleeve: { top: "28%", left: "13%", height: "48%", rotate: "-20deg" },
  },
  measurements: [
    { size: "XS", length: 70, shoulder: 50, chest: 60, sleeve: 62 },
    { size: "S", length: 72, shoulder: 52, chest: 62, sleeve: 63 },
    { size: "M", length: 74, shoulder: 54, chest: 64, sleeve: 64 },
    { size: "L", length: 76, shoulder: 56, chest: 66, sleeve: 65 },
    { size: "XL", length: 78, shoulder: 58, chest: 68, sleeve: 66 },
    { size: "XXL", length: 80, shoulder: 60, chest: 70, sleeve: 67 },
  ],
};

const HOODIE_SIZE_CHART: ProductSizeChart = {
  image: "/images/sizecharts/hoodie.svg",
  units: "cm",
  measureOverlay: {
    shoulder: { top: "10%", left: "20%", width: "60%" },
    chest: { top: "45%", left: "25%", width: "50%" },
    length: { top: "15%", left: "80%", height: "65%" },
    sleeve: { top: "30%", left: "10%", height: "50%", rotate: "-25deg" },
  },
  measurements: [
    { size: "XS", length: 66, shoulder: 52, chest: 58, sleeve: 60 },
    { size: "S", length: 68, shoulder: 54, chest: 60, sleeve: 61 },
    { size: "M", length: 70, shoulder: 56, chest: 62, sleeve: 62 },
    { size: "L", length: 72, shoulder: 58, chest: 64, sleeve: 63 },
    { size: "XL", length: 74, shoulder: 60, chest: 66, sleeve: 64 },
    { size: "XXL", length: 76, shoulder: 62, chest: 68, sleeve: 65 },
  ],
};

const PANTS_SIZE_CHART: ProductSizeChart = {
  image: "/images/sizecharts/pants.svg",
  units: "cm",
  measureOverlay: {
    waist: { top: "24%", left: "30%", width: "40%" },
    hip: { top: "36%", left: "26%", width: "48%" },
    inseam: { top: "44%", left: "52%", height: "42%" },
    outseam: { top: "24%", left: "68%", height: "62%" },
  },
  measurements: [
    { size: "XS", waist: 72, inseam: 70, outseam: 98 },
    { size: "S", waist: 76, inseam: 72, outseam: 100 },
    { size: "M", waist: 80, inseam: 74, outseam: 102 },
    { size: "L", waist: 84, inseam: 76, outseam: 104 },
    { size: "XL", waist: 88, inseam: 78, outseam: 106 },
    { size: "XXL", waist: 92, inseam: 80, outseam: 108 },
  ],
};

function resolveSizeChart(product: ProductApi | null): ProductSizeChart {
  if (product?.sizeChart?.measurements?.length) {
    return product.sizeChart;
  }

  const signature = `${product?.name ?? ""} ${product?.category ?? ""}`.toLowerCase();
  if (/(pant|trouser|jean|cargo|bottom)/.test(signature)) {
    return PANTS_SIZE_CHART;
  }
  if (/(hoodie|sweatshirt|pullover)/.test(signature)) {
    return HOODIE_SIZE_CHART;
  }
  return SHIRT_SIZE_CHART;
}

export default function ProductDetail() {
  const [, params] = useRoute<{ id: string }>("/product/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme } = useThemeStore();
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const openCartSidebar = useCartStore((state) => state.openCartSidebar);
  const closeCartSidebar = useCartStore((state) => state.closeCartSidebar);

  const productId = params?.id ?? "";
  const previewTemplateId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const rawValue = new URLSearchParams(window.location.search).get("canvasPreviewTemplateId");
    return rawValue && /^\d+$/.test(rawValue) ? rawValue : null;
  }, []);
  const { data: pageConfig } = useQuery({
    queryKey: ["page-config", previewTemplateId],
    queryFn: () => fetchPageConfig(previewTemplateId),
    staleTime: previewTemplateId !== null ? 0 : 5 * 60 * 1000,
    refetchOnMount: previewTemplateId !== null ? "always" : false,
    refetchOnWindowFocus: previewTemplateId !== null,
  });
  const isStuffyClone = pageConfig?.template?.slug === "stuffyclone";

  const { data: product, isLoading } = useQuery<ProductApi | null>({
    queryKey: ["products", productId],
    queryFn: () => fetchProductById(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: relatedProductsRaw = [] } = useQuery<ProductApi[]>({
    queryKey: ["products", { category: product?.category, limit: 5 }],
    queryFn: () => fetchProducts({ category: product?.category || undefined, limit: 5 }).then(r => r.products),
    enabled: !!product?.category,
    staleTime: 5 * 60 * 1000,
  });

  const relatedProducts = useMemo(() => {
    return (relatedProductsRaw || []).filter(p => p.id !== product?.id).slice(0, 4);
  }, [relatedProductsRaw, product?.id]);

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const colors = useMemo(() => parseJsonArray(product?.colorOptions ?? undefined), [product?.colorOptions]);
  const colorOptions = useMemo(
    () => colors.map((color) => ({ value: color, ...parseColorOption(color) })),
    [colors],
  );
  const effectiveColor = hoveredColor ?? selectedColor ?? (colors[0] ?? null);
  const colorImageMap = product?.colorImageMap ?? {};
  const normalizedColorImageMap = useMemo(() => {
    return Object.entries(colorImageMap).reduce<Record<string, string[]>>((acc, [key, value]) => {
      if (Array.isArray(value)) {
        acc[normalizeColorLabel(key)] = value.filter(Boolean);
      }
      return acc;
    }, {});
  }, [colorImageMap]);
  const stockBySize = product?.stockBySize ?? {};
  const configuredSizes = useMemo(
    () => parseJsonArray(product?.sizeOptions ?? undefined),
    [product?.sizeOptions],
  );
  const availableSizes = useMemo(() => {
    const ordered = new Set<string>();

    configuredSizes.forEach((size) => {
      const normalized = size.trim();
      if (normalized) ordered.add(normalized);
    });

    Object.keys(stockBySize).forEach((size) => {
      const normalized = size.trim();
      if (normalized) ordered.add(normalized);
    });

    (product?.variants ?? []).forEach((variant) => {
      const normalized = variant.size.trim();
      if (normalized) ordered.add(normalized);
    });

    return Array.from(ordered);
  }, [configuredSizes, product?.variants, stockBySize]);
  const galleryUrls = useMemo(() => parseJsonArray(product?.galleryUrls ?? undefined), [product?.galleryUrls]);
  const mainImageUrl = product?.imageUrl ?? "";
  const activeColorImages = useMemo(() => {
    if (!effectiveColor) return [];
    return normalizedColorImageMap[normalizeColorLabel(effectiveColor)] ?? [];
  }, [effectiveColor, normalizedColorImageMap]);
  const allImages = useMemo(() => {
    const baseList = mainImageUrl ? [mainImageUrl, ...galleryUrls] : [...galleryUrls];
    const colorList = activeColorImages.filter(Boolean);
    const list = colorList.length ? [...colorList, ...baseList.filter((url) => !colorList.includes(url))] : baseList;
    return list.length ? list : [""];
  }, [mainImageUrl, galleryUrls, activeColorImages]);
  const productSizeChart = useMemo(() => resolveSizeChart(product ?? null), [product]);
  const backToShopHref = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const requestedFrom = searchParams.get("from");

    if (requestedFrom && (requestedFrom.startsWith("/products") || requestedFrom.startsWith("/shop"))) {
      return requestedFrom;
    }

    return "/products";
  }, []);
  const isDarkMode = theme === "dark";
  const mediaResetKey = useMemo(
    () => `${product?.id ?? "product"}:${effectiveColor ?? "default"}:${allImages.length}`,
    [allImages.length, effectiveColor, product?.id],
  );

  const effectiveSize = selectedSize;
  const selectedVariant = useMemo(() => {
    if (!effectiveSize) return null;
    return (
      product?.variants?.find((variant) => {
        if (variant.size !== effectiveSize) return false;
        if (!effectiveColor) return true;
        return normalizeColorLabel(variant.color ?? "Default") === normalizeColorLabel(effectiveColor);
      }) ?? null
    );
  }, [effectiveColor, effectiveSize, product?.variants]);
  const selectedVariantStock = selectedSize
    ? (stockBySize[selectedSize as keyof typeof stockBySize] ?? 0)
    : null;

  useEffect(() => {
    if (availableSizes.length === 0) {
      if (selectedSize !== null) {
        setSelectedSize(null);
      }
      return;
    }

    const hasValidSelectedSize =
      selectedSize !== null && availableSizes.includes(selectedSize) && (stockBySize[selectedSize] ?? 0) > 0;

    if (hasValidSelectedSize) {
      return;
    }

    const firstInStockSize = availableSizes.find((size) => (stockBySize[size] ?? 0) > 0) ?? null;
    if (firstInStockSize !== selectedSize) {
      setSelectedSize(firstInStockSize);
    }
  }, [availableSizes, selectedSize, stockBySize]);

  useEffect(() => {
    if (selectedVariantStock !== null && quantity > selectedVariantStock) {
      setQuantity(1);
    }
  }, [quantity, selectedVariantStock]);

  if (isLoading || !product) {
    if (isLoading) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center">
          <BrandedLoader />
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-32 max-w-6xl text-center">
        <p className="uppercase text-[10px] tracking-widest font-bold text-muted-foreground">
          Product not found.
        </p>
        <Button asChild className="mt-6 rounded-none px-10">
          <Link href="/products">Back to collection</Link>
        </Button>
      </div>
    );
  }
  const hasSale = Boolean(product.saleActive) && Number(product.salePercentage) > 0;
  const effectiveUnitPrice = hasSale
    ? Number(product.price) * (1 - Number(product.salePercentage) / 100)
    : Number(product.price);

  const buildCartPayload = () => ({
    id: product.id,
    name: product.name,
    price: effectiveUnitPrice,
    originalPrice:
      hasSale ? Number(product.price) : null,
    salePercentage:
      product.salePercentage !== null && product.salePercentage !== undefined
        ? Number(product.salePercentage)
        : null,
    saleActive: hasSale,
    stock: product.stock,
    category: product.category ?? "",
    sku: product.id,
    images: allImages.filter(Boolean),
    variants: (product.variants ?? []).map((variant) => ({
      id: normalizeVariantId(variant.id),
      size: variant.size,
      color: parseColorOption(variant.color ?? "Default").label,
      stock: Number(variant.stock ?? product.stock ?? 0),
    })),
  });

  const buildVariantPayload = () => ({
    id: normalizeVariantId(selectedVariant?.id),
    size: effectiveSize ?? "One Size",
    color: parseColorOption(effectiveColor ?? "Default").label,
  });

  const handleAddToCart = () => {
    const result = addItem(
      buildCartPayload(),
      buildVariantPayload(),
      quantity,
    );

    if (!result.ok) {
      toast({
        title: "Stock limit reached",
        description: `Only ${result.maxAllowed} item${result.maxAllowed === 1 ? "" : "s"} are available for this variant.`,
        variant: "destructive",
      });
      return;
    }

    const isMobileOrTablet = window.matchMedia("(max-width: 1024px)").matches;
    toast({ title: "Added to bag", duration: isMobileOrTablet ? 1500 : undefined });
    openCartSidebar();
  };

  const handleBuyNow = () => {
    closeCartSidebar();
    clearCart();
    const result = addItem(
      buildCartPayload(),
      buildVariantPayload(),
      quantity,
    );
    if (!result.ok) {
      toast({
        title: "Stock limit reached",
        description: `Only ${result.maxAllowed} item${result.maxAllowed === 1 ? "" : "s"} are available for this variant.`,
        variant: "destructive",
      });
      return;
    }
    setLocation("/checkout");
  };

  const structuredData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": allImages.filter(Boolean),
    "description": product.description || product.shortDetails || "",
    "brand": {
      "@type": "Brand",
      "name": "Rare Atelier"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "NPR",
      "price": product.price,
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    }
  };

  const compactBreadcrumbProductLabel = product.name.toUpperCase();

  const colorSelectorBlock = colorOptions.length > 0 ? (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isStuffyClone ? "text-neutral-600 dark:text-neutral-300" : "text-muted-foreground"}`}>
          Color
        </p>
        {effectiveColor ? (
          <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isStuffyClone ? "text-neutral-500 dark:text-neutral-400" : "text-muted-foreground/80"}`}>
            {parseColorOption(effectiveColor).label}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {colorOptions.map((color) => {
          const isActive = normalizeColorLabel(effectiveColor ?? "") === normalizeColorLabel(color.value);
          return (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color.value)}
              onMouseEnter={() => setHoveredColor(color.value)}
              onMouseLeave={() => setHoveredColor(null)}
              className={`relative h-7 w-7 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 dark:focus-visible:ring-white/30 dark:focus-visible:ring-offset-black ${
                isActive
                  ? "scale-105 border-neutral-950 ring-2 ring-neutral-950/20 dark:border-white dark:ring-white/20"
                  : "border-neutral-300 hover:border-neutral-950 dark:border-white/20 dark:hover:border-white/50"
              }`}
              style={{
                background:
                  color.swatch ??
                  "linear-gradient(135deg, rgba(120,120,120,0.18), rgba(120,120,120,0.4))",
              }}
              aria-label={`Select ${color.label} color`}
            >
              <span className="sr-only">{color.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  const sizeSelectorBlock = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isStuffyClone ? "text-neutral-600 dark:text-neutral-300" : "text-muted-foreground"}`}>
          Size
        </p>
        <button
          onClick={() => setShowSizeGuide(true)}
          className={`flex items-center gap-1.5 text-[12px] font-semibold underline underline-offset-4 transition-opacity duration-200 hover:opacity-70 ${isStuffyClone ? "text-neutral-950 decoration-neutral-950 dark:text-white dark:decoration-white" : "text-foreground decoration-foreground"}`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Size &amp; Fit Guide
        </button>
      </div>
      <div className={`flex flex-wrap ${isStuffyClone ? "gap-2" : "gap-3"}`}>
        {availableSizes.map((size) => {
          const sizeStock = stockBySize[size] ?? 0;
          const isOutOfStock = sizeStock === 0;
          const isLowStock = sizeStock > 0 && sizeStock <= 5;
          const isSelected = selectedSize === size;

          return (
            <div key={size} className={`flex flex-col items-center ${isStuffyClone ? "gap-0.5" : "gap-1"}`}>
              <button
                type="button"
                onClick={() => !isOutOfStock && setSelectedSize(size)}
                disabled={isOutOfStock}
                className={`relative ${isStuffyClone ? "h-10 w-10 text-[14px]" : "h-12 w-12 text-sm"} rounded-md border font-medium transition-all duration-200 ${
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : isOutOfStock
                      ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-neutral-500"
                      : "cursor-pointer border-neutral-300 hover:border-neutral-950 dark:border-white/15 dark:hover:border-white"
                }`}
              >
                {size}
                {isOutOfStock ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <svg
                      className={`absolute inset-0 h-full w-full ${isStuffyClone ? "text-neutral-400/40 dark:text-neutral-500/40" : "text-muted-foreground/30"}`}
                      viewBox="0 0 48 48"
                      preserveAspectRatio="none"
                    >
                      <line x1="4" y1="4" x2="44" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                ) : null}
              </button>

              {isOutOfStock ? (
                <span className={`text-center text-[10px] leading-tight ${isStuffyClone ? "text-neutral-500 dark:text-neutral-400" : "text-muted-foreground/60"}`}>
                  Out of
                  <br />
                  stock
                </span>
              ) : null}

              {isLowStock && !isOutOfStock ? (
                <span className="text-center text-[10px] leading-tight text-amber-500">
                  Only {sizeStock}
                  <br />
                  left
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {selectedSize && selectedVariantStock !== null ? (
        <p
          className={`text-xs ${
            selectedVariantStock === 0
              ? "text-red-500"
              : selectedVariantStock <= 5
                ? "text-amber-500"
                : "text-muted-foreground"
          }`}
        >
          {selectedVariantStock === 0
            ? "This size is not available in store"
            : selectedVariantStock <= 5
              ? `Only ${selectedVariantStock} units left in this size`
              : `${selectedVariantStock} in stock`}
        </p>
      ) : null}
    </div>
  );

  const quantitySelectorBlock = (
    <div className="space-y-2">
      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isStuffyClone ? "text-neutral-600 dark:text-neutral-300" : "text-muted-foreground"}`}>
        Quantity
      </p>
      <div className={`flex w-fit items-center rounded-sm border ${isStuffyClone ? "border-neutral-200 dark:border-white/15" : "border-gray-200 dark:border-gray-700"}`}>
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className={`flex ${isStuffyClone ? "h-8 w-8" : "h-10 w-10"} items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5`}
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          min={1}
          max={selectedVariantStock ?? 1}
          value={quantity}
          onChange={(event) => setQuantity(Math.max(1, Math.min(selectedVariantStock ?? 1, Number(event.target.value) || 1)))}
          className={`w-10 bg-transparent text-center text-sm outline-none ${isStuffyClone ? "text-neutral-950 dark:text-white" : ""}`}
        />
        <button
          type="button"
          onClick={() => setQuantity(Math.min(selectedVariantStock ?? 1, quantity + 1))}
          className={`flex ${isStuffyClone ? "h-8 w-8" : "h-10 w-10"} items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  const purchaseButtonsBlock = (
    <div className={isStuffyClone ? "flex flex-wrap gap-3 pt-1" : "flex flex-col gap-3 pt-2"}>
      <Button
        data-testid="product-add-to-bag"
        onClick={handleAddToCart}
        disabled={!selectedSize || selectedVariantStock === 0}
        className={isStuffyClone ? "h-10 min-w-[9.25rem] rounded-full border border-neutral-950 bg-white px-5 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-950 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white/10" : "h-14 w-full rounded-none bg-black text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-200"}
      >
        {!selectedSize
          ? "Select Size"
          : selectedVariantStock === 0
            ? "Out of Stock"
            : "Add to Bag"}
      </Button>
      <Button
        data-testid="product-buy-now"
        variant="outline"
        onClick={handleBuyNow}
        disabled={!selectedSize || selectedVariantStock === 0}
        className={isStuffyClone ? "h-10 min-w-[9.25rem] rounded-full border border-neutral-950 bg-neutral-950 px-5 text-[10px] font-bold uppercase tracking-[0.22em] text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-neutral-200" : "h-14 w-full rounded-none border-zinc-900 text-xs font-bold uppercase tracking-[0.2em] text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black"}
      >
        Buy Now
      </Button>
    </div>
  );

  const purchasePanel = isStuffyClone ? (
    <div className="space-y-4">
      {colorSelectorBlock ? colorSelectorBlock : null}
      {sizeSelectorBlock}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {quantitySelectorBlock}
        {purchaseButtonsBlock}
      </div>
    </div>
  ) : (
    <>
      {sizeSelectorBlock}
      {quantitySelectorBlock}
      {purchaseButtonsBlock}
    </>
  );


  return (
    <div className={`relative w-full pb-12 ${isStuffyClone ? "min-h-screen bg-white pt-[4.1rem] text-neutral-950 dark:bg-[#050505] dark:text-white lg:pt-[4.12rem]" : "px-3 pt-0 sm:px-6 lg:px-8 xl:px-10"}`}>
      <StorefrontSeo
        title={`${product.name} | Rare Atelier`}
        description={
          product.shortDetails ||
          product.description?.substring(0, 160) ||
          `Buy ${product.name} at Rare Atelier.`
        }
        image={mainImageUrl}
        canonicalPath={`/product/${product.id}`}
        type="product"
        structuredData={structuredData}
      />

      {!isStuffyClone ? (
        <div className="pointer-events-none absolute left-3 top-4 z-40 max-w-[calc(100vw-8.5rem)] sm:left-6 sm:top-5 lg:left-8 xl:left-10">
          <div className="pointer-events-auto inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-black/10 bg-white/92 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/62 dark:text-white">
            <Link href="/" className="shrink-0 transition-opacity hover:opacity-65">
              Home
            </Link>
            <span className="opacity-45">{">"}</span>
            <Link href={backToShopHref} className="shrink-0 transition-opacity hover:opacity-65">
              Shop
            </Link>
            <span className="opacity-45">{">"}</span>
            <span className="min-w-0 max-w-[12ch] truncate sm:max-w-[18ch] lg:max-w-[26ch]">
              {compactBreadcrumbProductLabel}
            </span>
          </div>
        </div>
      ) : null}

      <div className="relative lg:min-h-screen">
        <div
          className={`grid gap-8 lg:items-start lg:gap-8 xl:gap-10 ${
            isStuffyClone
              ? "lg:grid-cols-[minmax(0,1.01fr)_minmax(24rem,0.99fr)] lg:gap-0"
              : "lg:h-screen lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1.9fr)_minmax(300px,1fr)]"
          }`}
        >
        <aside className={`space-y-4 ${isStuffyClone ? "order-2 px-4 sm:px-5 lg:order-2 lg:col-start-2 lg:self-start lg:sticky lg:top-[3.68rem] lg:space-y-2 lg:pl-5 lg:pr-6 xl:pl-6 xl:pr-8 lg:pt-0 lg:pb-5 text-neutral-950 dark:text-white" : "lg:py-24"}`}>
          {isStuffyClone ? (
            <div className="space-y-2 border-b border-neutral-200 pb-2 dark:border-white/10">
              <div className="space-y-2">
                <h1
                  style={{
                    fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
                    fontWeight: 700,
                    fontSize: "21px",
                    lineHeight: "24px",
                    color: "var(--brand-product-detail)",
                  }}
                  className="text-black dark:text-white"
                >
                  {product.name}
                </h1>
                <div className="space-y-2.5">
                  <p
                    style={{
                      fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
                      fontWeight: 700,
                      fontSize: "18px",
                      lineHeight: "22px",
                      color: "#15803d",
                    }}
                    className="flex flex-col items-start gap-1 font-bold text-emerald-700 dark:text-emerald-400"
                  >
                    {product.saleActive && Number(product.salePercentage) > 0 ? (
                      <>
                        <span className="font-black text-emerald-700 dark:text-emerald-400">
                          {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                        </span>
                        <span className="text-[12px] font-semibold line-through text-neutral-700 opacity-60 dark:text-neutral-400">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      formatPrice(product.price)
                    )}
                  </p>
                  {product.category ? (
                    <div className="pt-1">
                      <span className="inline-flex items-center rounded-none border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700 shadow-[0_8px_20px_rgba(14,116,144,0.08)] dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300">
                        {product.category}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
              {product.shortDetails ? (
                <p className="max-w-[40ch] text-[12px] leading-[1.45] text-neutral-700 dark:text-neutral-200">
                  {product.shortDetails}
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <h1
                style={{
                  fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: "24px",
                  lineHeight: "36px",
                  color: "var(--brand-product-detail)",
                }}
                className={`font-bold uppercase tracking-tight ${isStuffyClone ? "text-black dark:text-white" : ""}`}
              >
                {product.name}
              </h1>

              {!isStuffyClone && product.category ? (
                <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${isStuffyClone ? "text-neutral-600 dark:text-neutral-300" : "text-muted-foreground"}`}>
                  {product.category}
                </p>
              ) : null}

              {product.shortDetails ? <p className={`text-sm leading-relaxed ${isStuffyClone ? "text-neutral-700 dark:text-neutral-200" : "text-muted-foreground"}`}>{product.shortDetails}</p> : null}
            </>
          )}

          {!isStuffyClone ? colorSelectorBlock : null}

          {!isStuffyClone ? (
            <p
              style={{
                fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "36px",
                color: "var(--brand-product-detail)",
              }}
              className="flex flex-col items-start gap-1 font-bold"
            >
              {product.saleActive && Number(product.salePercentage) > 0 ? (
                <>
                  <span className="flex items-center gap-3">
                    <span className="font-black text-primary">
                      {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                    </span>
                    <span className="text-base font-semibold line-through text-muted-foreground opacity-60">
                      {formatPrice(product.price)}
                    </span>
                  </span>
                  <span className="mt-1 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    {product.salePercentage}% OFF SALE
                  </span>
                </>
              ) : (
                formatPrice(product.price)
              )}
            </p>
          ) : null}

          {isStuffyClone ? (
            <div className="space-y-4 pt-2">
              {purchasePanel}
            </div>
          ) : null}

          <div className={`space-y-1.5 border-t pt-3 ${isStuffyClone ? "border-neutral-200 dark:border-white/10" : "border-border"}`}>
            <details open className={`group rounded-md border px-3 py-2 transition-colors duration-200 ${isStuffyClone ? "border-neutral-200 bg-white open:border-neutral-900/20 dark:border-white/10 dark:bg-[#0f0f0f] dark:open:border-white/20" : "border-border/80 bg-background/70 open:border-foreground/20"}`}>
              <summary className="list-none cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-4 w-4 transition-colors duration-200 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-200 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`}>
                      Description
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-all duration-300 group-open:rotate-180 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`} />
                </div>
              </summary>
              <div className={`pt-3 pb-1 text-[15px] leading-7 ${isStuffyClone ? "text-neutral-800 dark:text-neutral-100" : "text-foreground/90"}`}>
                {product.description || "This piece is crafted in limited runs with a clean, tailored streetwear silhouette."}
              </div>
            </details>

            <details className={`group rounded-md border px-3 py-2 transition-colors duration-200 ${isStuffyClone ? "border-neutral-200 bg-white open:border-neutral-900/20 dark:border-white/10 dark:bg-[#0f0f0f] dark:open:border-white/20" : "border-border/80 bg-background/70 open:border-foreground/20"}`}>
              <summary className="list-none cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`h-4 w-4 transition-colors duration-200 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-200 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`}>
                      Product Details
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-all duration-300 group-open:rotate-180 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`} />
                </div>
              </summary>
              <ul className={`space-y-2 pt-3 pb-1 text-[14px] leading-7 ${isStuffyClone ? "text-neutral-700 dark:text-neutral-200" : "text-muted-foreground"}`}>
                <li className="flex items-start gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-foreground/50" />
                  <span>Limited-run production with refined finishing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-foreground/50" />
                  <span>Built for daily wear with elevated streetwear structure.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-foreground/50" />
                  <span>Category: {product.category || "Rare Atelier Signature"}.</span>
                </li>
              </ul>
            </details>

            <details className={`group rounded-md border px-3 py-2 transition-colors duration-200 ${isStuffyClone ? "border-neutral-200 bg-white open:border-neutral-900/20 dark:border-white/10 dark:bg-[#0f0f0f] dark:open:border-white/20" : "border-border/80 bg-background/70 open:border-foreground/20"}`}>
              <summary className="list-none cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Truck className={`h-4 w-4 transition-colors duration-200 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-colors duration-200 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`}>
                      Shipping & Returns
                    </span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-all duration-300 group-open:rotate-180 ${isStuffyClone ? "text-neutral-500 group-open:text-neutral-950 dark:text-neutral-400 dark:group-open:text-white" : "text-muted-foreground group-open:text-foreground"}`} />
                </div>
              </summary>
              <div className={`space-y-2 pt-3 pb-1 text-[14px] leading-7 ${isStuffyClone ? "text-neutral-700 dark:text-neutral-200" : "text-muted-foreground"}`}>
                <p>Shipping across Nepal in 2-5 business days.</p>
                <p>Easy exchange support for size issues when stock is available.</p>
              </div>
            </details>
          </div>
        </aside>

        <ProductMediaStage
          productName={product.name}
          priceLabel={product.saleActive && Number(product.salePercentage) > 0
            ? formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))
            : formatPrice(product.price)}
          imageUrls={allImages}
          stock={product.stock}
          isDarkMode={isDarkMode}
          isStuffyClone={isStuffyClone}
          mediaResetKey={mediaResetKey}
        />

        {!isStuffyClone ? (
          <aside className="space-y-6 lg:py-24">
            {purchasePanel}
          </aside>
        ) : null}
        </div>
      </div>

      <Suspense fallback={null}>
        {showSizeGuide ? (
          <SizeFitGuide
            open={showSizeGuide}
            onClose={() => setShowSizeGuide(false)}
            productName={product.name}
            sizeChart={productSizeChart}
            productImage={allImages.find(Boolean) ?? null}
            selectedSize={selectedSize}
          />
        ) : null}
      </Suspense>

      <div className={`mt-24 border-t pt-16 ${isStuffyClone ? "border-neutral-200 dark:border-white/10" : "border-gray-100"}`} style={{ contentVisibility: "auto", containIntrinsicSize: "1200px" }}>
        <h2 className={`mb-12 text-center text-xl font-black uppercase tracking-tighter ${isStuffyClone ? "text-neutral-950 dark:text-white" : ""}`}>
          You May Also Like
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {relatedProducts.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}?from=${encodeURIComponent(backToShopHref)}`}
                className="group block"
                onClick={() => {
                  window.scrollTo(0, 0);
              }}
            >
              <div className="relative mb-4 aspect-[3/4] overflow-hidden rounded-sm bg-neutral-100 dark:bg-neutral-900">
                <img
                  src={p.imageUrl ?? ""}
                  alt={p.name}
                  loading="lazy"
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className={`space-y-1 ${isStuffyClone ? "text-neutral-950 dark:text-white" : ""}`}>
                <h3 className={`truncate text-sm font-bold uppercase tracking-tight ${isStuffyClone ? "text-neutral-950 dark:text-white" : ""}`}>{p.name}</h3>
                <div className="flex items-center gap-2">
                  <p className={`text-xs uppercase tracking-widest ${p.saleActive ? 'text-primary font-bold' : isStuffyClone ? 'text-neutral-600 dark:text-neutral-300' : 'text-muted-foreground'}`}>
                    {p.saleActive && Number(p.salePercentage) > 0 
                      ? formatPrice(Number(p.price) * (1 - Number(p.salePercentage) / 100))
                      : formatPrice(p.price)
                    }
                  </p>
                  {p.saleActive && Number(p.salePercentage) > 0 && (
                    <p className={`text-[10px] line-through opacity-60 ${isStuffyClone ? "text-neutral-500 dark:text-neutral-400" : "text-muted-foreground"}`}>
                      {formatPrice(p.price)}
                    </p>
                  )}
                  {p.saleActive && Number(p.salePercentage) > 0 && (
                    <span className="bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-sm shadow-xl inline-block ml-1">
                      {p.salePercentage}% OFF
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
