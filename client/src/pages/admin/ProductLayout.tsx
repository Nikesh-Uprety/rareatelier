import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LayoutTemplate,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  fetchAdminProductsLayout,
  fetchAdminProductsPage,
  updateAdminProductsLayout,
} from "@/lib/adminApi";
import { fetchCategories, type CategoryApi, type ProductApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  getDefaultStorefrontProductsLayoutConfig,
  getStorefrontProductsCategoryLayout,
  normalizeStorefrontProductsLayoutConfig,
  STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY,
  STOREFRONT_PRODUCTS_DEFAULT_COLUMNS,
  STOREFRONT_PRODUCTS_MAX_COLUMNS,
  STOREFRONT_PRODUCTS_MIN_COLUMNS,
  type StorefrontProductsLayoutConfig,
} from "@shared/storefrontProductsLayout";

const DESKTOP_COLUMN_OPTIONS = Array.from(
  { length: STOREFRONT_PRODUCTS_MAX_COLUMNS - STOREFRONT_PRODUCTS_MIN_COLUMNS + 1 },
  (_, index) => STOREFRONT_PRODUCTS_MIN_COLUMNS + index,
);

function normalizeCategoryToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[_\s-]+/g, "");
}

function resolveProductCategoryKey(
  product: ProductApi,
  categories: CategoryApi[],
): string {
  const rawCategory = (product.category ?? "").trim();
  if (!rawCategory) return STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY;

  const normalized = normalizeCategoryToken(rawCategory);
  const matchedCategory = categories.find((category) => {
    const normalizedSlug = normalizeCategoryToken(category.slug);
    const normalizedName = normalizeCategoryToken(category.name);
    return normalizedSlug === normalized || normalizedName === normalized;
  });

  return matchedCategory?.slug ?? rawCategory;
}

async function fetchAllAdminActiveProducts(): Promise<ProductApi[]> {
  const limit = 120;
  const firstPage = await fetchAdminProductsPage({ page: 1, limit, status: "active" });
  const totalPages = Math.max(1, Math.ceil((firstPage.total ?? 0) / limit));

  if (totalPages <= 1) {
    return firstPage.data;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminProductsPage({
        page: index + 2,
        limit,
        status: "active",
      }),
    ),
  );

  return [firstPage, ...remainingPages].flatMap((pageResult) => pageResult.data);
}

export default function AdminProductLayout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(
    STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY,
  );
  const [draftConfig, setDraftConfig] = useState<StorefrontProductsLayoutConfig>(
    getDefaultStorefrontProductsLayoutConfig(),
  );
  const [pendingProductId, setPendingProductId] = useState("");

  const { data: layoutConfig, isLoading: layoutLoading } = useQuery({
    queryKey: ["admin", "products", "layout"],
    queryFn: fetchAdminProductsLayout,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin", "products", "layout", "catalog"],
    queryFn: fetchAllAdminActiveProducts,
  });

  useEffect(() => {
    if (!layoutConfig) return;
    setDraftConfig(normalizeStorefrontProductsLayoutConfig(layoutConfig));
  }, [layoutConfig]);

  useEffect(() => {
    setPendingProductId("");
  }, [selectedCategoryKey]);

  const saveMutation = useMutation({
    mutationFn: (config: StorefrontProductsLayoutConfig) =>
      updateAdminProductsLayout(config),
    onSuccess: (savedConfig) => {
      const normalized = normalizeStorefrontProductsLayoutConfig(savedConfig);
      setDraftConfig(normalized);
      queryClient.setQueryData(["admin", "products", "layout"], normalized);
      queryClient.invalidateQueries({ queryKey: ["page-config"] });
      toast({
        title: "Products layout saved",
        description: "The storefront products page now uses the latest layout settings.",
      });
    },
    onError: (error) => {
      toast({
        title: "Could not save products layout",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    },
  });

  const categoryOptions = useMemo(
    () => [
      {
        key: STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY,
        label: "All products",
      },
      ...categories.map((category) => ({
        key: category.slug,
        label: category.name,
      })),
    ],
    [categories],
  );

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, ProductApi[]>();
    grouped.set(STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY, products);

    products.forEach((product) => {
      const categoryKey = resolveProductCategoryKey(product, categories);
      const existing = grouped.get(categoryKey) ?? [];
      existing.push(product);
      grouped.set(categoryKey, existing);
    });

    return grouped;
  }, [products, categories]);

  const currentCategoryLayout = useMemo(
    () => getStorefrontProductsCategoryLayout(draftConfig, selectedCategoryKey),
    [draftConfig, selectedCategoryKey],
  );

  const availableProducts = useMemo(
    () => productsByCategory.get(selectedCategoryKey) ?? [],
    [productsByCategory, selectedCategoryKey],
  );

  const featuredProducts = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return currentCategoryLayout.featuredProductIds
      .map((productId) => productMap.get(productId))
      .filter((product): product is ProductApi => Boolean(product));
  }, [currentCategoryLayout.featuredProductIds, products]);

  const availableProductOptions = useMemo(() => {
    const selectedIds = new Set(currentCategoryLayout.featuredProductIds);
    return availableProducts.filter((product) => !selectedIds.has(product.id));
  }, [availableProducts, currentCategoryLayout.featuredProductIds]);

  const selectedCategoryLabel =
    categoryOptions.find((option) => option.key === selectedCategoryKey)?.label ??
    "Selected category";

  const updateDraftCategory = (
    categoryKey: string,
    updater: (
      current: ReturnType<typeof getStorefrontProductsCategoryLayout>,
    ) => ReturnType<typeof getStorefrontProductsCategoryLayout>,
  ) => {
    setDraftConfig((current) => {
      const normalized = normalizeStorefrontProductsLayoutConfig(current);
      const existing = getStorefrontProductsCategoryLayout(normalized, categoryKey);
      return {
        ...normalized,
        categories: {
          ...normalized.categories,
          [categoryKey]: updater(existing),
        },
      };
    });
  };

  const updateColumns = (value: string) => {
    const desktopColumns = Number(value) || STOREFRONT_PRODUCTS_DEFAULT_COLUMNS;
    if (selectedCategoryKey === STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY) {
      setDraftConfig((current) => ({
        ...normalizeStorefrontProductsLayoutConfig(current),
        defaultDesktopColumns: desktopColumns,
      }));
      return;
    }

    updateDraftCategory(selectedCategoryKey, (current) => ({
      ...current,
      desktopColumns,
    }));
  };

  const toggleShowInMenu = (checked: boolean) => {
    if (selectedCategoryKey === STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY) return;

    updateDraftCategory(selectedCategoryKey, (current) => ({
      ...current,
      showInMenu: checked,
    }));
  };

  const addFeaturedProduct = (productId: string) => {
    if (!productId || productId === "__none__") return;

    updateDraftCategory(selectedCategoryKey, (current) => ({
      ...current,
      featuredProductIds: [...current.featuredProductIds, productId],
    }));
    setPendingProductId("");
  };

  const moveFeaturedProduct = (index: number, direction: -1 | 1) => {
    updateDraftCategory(selectedCategoryKey, (current) => {
      const nextIds = [...current.featuredProductIds];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= nextIds.length) return current;
      [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
      return {
        ...current,
        featuredProductIds: nextIds,
      };
    });
  };

  const removeFeaturedProduct = (productId: string) => {
    updateDraftCategory(selectedCategoryKey, (current) => ({
      ...current,
      featuredProductIds: current.featuredProductIds.filter((id) => id !== productId),
    }));
  };

  const isLoading = layoutLoading || categoriesLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <BrandedLoader />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="h-auto gap-2 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => setLocation("/admin/products")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to products
          </Button>
          <div>
            <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground">
              Products Layout
            </h1>
            <p className="mt-1 text-muted-foreground">
              Control the storefront shop grid, category menu, and featured product placement.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => window.open("/products", "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview shop
          </Button>
          <Button
            className="rounded-2xl bg-gradient-to-r from-[#2C5234] to-[#3A6A45] text-white shadow-[0_10px_24px_rgba(34,63,41,0.2)] hover:brightness-110"
            onClick={() => saveMutation.mutate(draftConfig)}
            disabled={saveMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Saving..." : "Save layout"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
        <Card className="rounded-3xl border-[#DCE8DB] bg-gradient-to-br from-white to-[#F4F8F3] shadow-[0_14px_34px_rgba(34,63,41,0.08)] dark:border-[#2E3B32] dark:bg-[#151E17]">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF5EB] text-[#2C5234] dark:bg-[#223126] dark:text-[#D7E9D9]">
                <LayoutTemplate className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Storefront controls</CardTitle>
                <CardDescription>
                  Decide how the shop page menu and product grid behave before editing category-specific placement.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-[#DCE8DB] bg-white/80 px-4 py-4 dark:border-[#314035] dark:bg-[#18211B]">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Show category menu on shop page</Label>
                <p className="text-sm text-muted-foreground">
                  Lets customers switch categories directly from the storefront products page.
                </p>
              </div>
              <Switch
                checked={draftConfig.showCategoryMenu}
                onCheckedChange={(checked) =>
                  setDraftConfig((current) => ({
                    ...normalizeStorefrontProductsLayoutConfig(current),
                    showCategoryMenu: checked,
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Category to edit</Label>
              <Select value={selectedCategoryKey} onValueChange={setSelectedCategoryKey}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Desktop columns for {selectedCategoryLabel.toLowerCase()}
                </Label>
                <Select
                  value={String(
                    selectedCategoryKey === STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY
                      ? draftConfig.defaultDesktopColumns
                      : currentCategoryLayout.desktopColumns,
                  )}
                  onValueChange={updateColumns}
                >
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Choose columns" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESKTOP_COLUMN_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} columns
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The storefront shows roughly four rows at a time using this desktop column count.
                </p>
              </div>

              {selectedCategoryKey !== STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY ? (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Category menu visibility</Label>
                  <div className="flex items-center justify-between rounded-2xl border border-[#DCE8DB] bg-white/80 px-4 py-3 dark:border-[#314035] dark:bg-[#18211B]">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Show this category in the menu</p>
                      <p className="text-xs text-muted-foreground">
                        Hidden categories still work internally, but customers won’t see them in the storefront switcher.
                      </p>
                    </div>
                    <Switch
                      checked={currentCategoryLayout.showInMenu}
                      onCheckedChange={toggleShowInMenu}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#DCE8DB] bg-white/70 p-4 text-sm text-muted-foreground dark:border-[#314035] dark:bg-[#18211B]">
                  The all-products view uses the default desktop column count above. Category menu visibility only applies to specific categories.
                </div>
              )}
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#DCE8DB] bg-white/80 p-4 dark:border-[#314035] dark:bg-[#18211B]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Menu
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {draftConfig.showCategoryMenu ? "On" : "Off"}
                </p>
              </div>
              <div className="rounded-2xl border border-[#DCE8DB] bg-white/80 p-4 dark:border-[#314035] dark:bg-[#18211B]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Desktop grid
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {selectedCategoryKey === STOREFRONT_PRODUCTS_ALL_CATEGORY_KEY
                    ? draftConfig.defaultDesktopColumns
                    : currentCategoryLayout.desktopColumns}
                  <span className="ml-1 text-base text-muted-foreground">cols</span>
                </p>
              </div>
              <div className="rounded-2xl border border-[#DCE8DB] bg-white/80 p-4 dark:border-[#314035] dark:bg-[#18211B]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Featured slots
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {currentCategoryLayout.featuredProductIds.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[#DCE8DB] bg-white shadow-[0_14px_34px_rgba(34,63,41,0.08)] dark:border-[#2E3B32] dark:bg-[#151E17]">
          <CardHeader className="space-y-2">
            <CardTitle>Featured placement for {selectedCategoryLabel}</CardTitle>
            <CardDescription>
              Products added here are prioritized first on the storefront grid in the same order shown below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="min-w-0 flex-1">
                <Label className="mb-2 block text-sm font-semibold">Add product to the showcase order</Label>
                <Select value={pendingProductId} onValueChange={setPendingProductId}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Select a product to pin into the first grid positions" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProductOptions.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No more products available
                      </SelectItem>
                    ) : (
                      availableProductOptions.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  className="h-11 rounded-2xl"
                  onClick={() => addFeaturedProduct(pendingProductId)}
                  disabled={!pendingProductId || pendingProductId === "__none__"}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add featured product
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-[#DCE8DB] bg-[#FAFCF9] p-4 dark:border-[#314035] dark:bg-[#18211B]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Showcase order</p>
                  <p className="text-sm text-muted-foreground">
                    The storefront uses this order first, then fills the rest of the grid with the remaining products in the category.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {featuredProducts.length} selected
                </Badge>
              </div>

              {featuredProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#D0DED0] bg-white/80 px-5 py-10 text-center text-sm text-muted-foreground dark:border-[#334437] dark:bg-[#141D17]">
                  No featured placements set yet for this category.
                </div>
              ) : (
                <div className="space-y-3">
                  {featuredProducts.map((product, index) => (
                    <div
                      key={product.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[#DCE8DB] bg-white px-4 py-4 shadow-sm dark:border-[#314035] dark:bg-[#141D17] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EDF5EB] text-sm font-semibold text-[#2C5234] dark:bg-[#223126] dark:text-[#D7E9D9]">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {(product.category ?? "Uncategorized").trim() || "Uncategorized"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => moveFeaturedProduct(index, -1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full"
                          onClick={() => moveFeaturedProduct(index, 1)}
                          disabled={index === featuredProducts.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
                          onClick={() => removeFeaturedProduct(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
