import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { fetchProducts, fetchCategories, type ProductApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { BrandedLoader } from "@/components/ui/BrandedLoader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function parseJsonArray(s: string | null | undefined): string[] {
  if (!s || !s.trim()) return [];
  try {
    const a = JSON.parse(s);
    return Array.isArray(a)
      ? a.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function getHoverImage(product: ProductApi): string {
  const gallery = parseJsonArray(product.galleryUrls);
  const main = product.imageUrl ?? "";
  if (gallery.length === 0) return main;
  if (gallery[0] && gallery[0] !== main) return gallery[0];
  return gallery[1] ?? main;
}

export default function Products() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");

  const [category, setCategory] = useState<string>(initialCategory || "all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const filters = useMemo(
    () => ({
      category: category === "all" ? undefined : category,
      sortBy,
      page: 1,
    }),
    [category, sortBy],
  );

  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useQuery<ProductApi[]>({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const filtered =
      category === "all" ? [...products] : products.filter((p) => (p.category ?? "") === category);

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-high":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => Number(b.id) - Number(a.id));
        break;
    }

    return filtered;
  }, [
    products,
    category,
    sortBy,
  ]);

  const MAX_INLINE_CATEGORIES = 6;
  const inlineCategories = categories.slice(0, MAX_INLINE_CATEGORIES);
  const overflowCategories = categories.slice(MAX_INLINE_CATEGORIES);
  const isOverflowSelected = overflowCategories.some((cat) => cat.slug === category);

  return (
    <div className="container mx-auto px-4 py-16 mt-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black uppercase tracking-tight text-neutral-900 dark:text-neutral-100">
          All Products
        </h1>
      </div>

      <div>
        <div className="text-neutral-900 dark:text-neutral-100 min-h-[400px]">
          <div className="mb-10 space-y-5">
            <p
              style={{ fontFamily: "Roboto, sans-serif" }}
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400"
            >
              Showing {filteredProducts.length} results
            </p>

            <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
              <div className="w-full overflow-x-auto scrollbar-hide md:col-start-2 md:w-auto md:max-w-full md:justify-self-center">
                <div className="flex w-max min-w-full items-center gap-6 md:min-w-0 md:justify-center">
                  <button
                    onClick={() => setCategory("all")}
                    style={{ fontFamily: "Roboto, sans-serif" }}
                    className={`shrink-0 border-b-2 px-1 py-1 text-sm md:text-base font-black uppercase tracking-wider transition-colors ${
                      category === "all"
                        ? "border-current text-neutral-900 dark:text-neutral-100"
                        : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                    }`}
                  >
                    All
                  </button>
                  {inlineCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.slug)}
                      style={{ fontFamily: "Roboto, sans-serif" }}
                      className={`shrink-0 border-b-2 px-1 py-1 text-sm md:text-base font-black uppercase tracking-wider transition-colors ${
                        category === cat.slug
                          ? "border-current text-neutral-900 dark:text-neutral-100"
                          : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {overflowCategories.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          style={{ fontFamily: "Roboto, sans-serif" }}
                          className={`shrink-0 border-b-2 px-1 py-1 text-sm md:text-base font-black uppercase tracking-wider transition-colors ${
                            isOverflowSelected
                              ? "border-current text-neutral-900 dark:text-neutral-100"
                              : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                          }`}
                        >
                          More
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[12rem]">
                        <DropdownMenuRadioGroup
                          value={category}
                          onValueChange={(value) => setCategory(value)}
                        >
                          {overflowCategories.map((cat) => (
                            <DropdownMenuRadioItem key={cat.id} value={cat.slug}>
                              {cat.name}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 whitespace-nowrap md:col-start-3 md:justify-self-end">
                <span
                  style={{ fontFamily: "Roboto, sans-serif" }}
                  className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400"
                >
                  Sort By
                </span>
                <select
                  style={{ fontFamily: "Roboto, sans-serif" }}
                  className="h-10 min-w-[9.5rem] pl-4 pr-10 bg-transparent border border-black/[0.08] dark:border-white/[0.2] rounded text-[10px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-black dark:focus:ring-white appearance-none cursor-pointer text-neutral-900 dark:text-neutral-100"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px] w-full col-span-full">
              <BrandedLoader />
            </div>
          ) : isError ? (
            <div className="py-20 text-center space-y-4">
              <p className="uppercase text-[10px] tracking-widest font-bold text-neutral-400 dark:text-neutral-500">
                Failed to load products. Try again.
              </p>
              <button
                onClick={() => refetch()}
                className="text-[10px] uppercase tracking-widest border border-neutral-600 dark:border-neutral-300 px-4 py-2 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div>
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredProducts.map((product) => {
                    const hoverImage = getHoverImage(product);
                    const mainImage = product.imageUrl ?? hoverImage ?? "";
                    return (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="group block"
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-white/[0.02] dark:bg-white/[0.04] mb-4 relative rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(`/product/${product.id}`, "_blank");
                            }}
                            className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Open product in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          {product.saleActive && Number(product.salePercentage) > 0 && (
                            <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-xl animate-pulse">
                              {product.salePercentage}% OFF
                            </div>
                          )}
                          {product.stock === 0 && (
                            <div
                              className={`absolute ${product.saleActive ? "top-12" : "top-3"} left-3 z-10 bg-black/80 dark:bg-neutral-800/90 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded`}
                            >
                              Out of Stock
                            </div>
                          )}
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="absolute inset-0 h-full w-full object-cover opacity-100 group-hover:opacity-0 transition-none"
                          />
                          <img
                            src={hoverImage}
                            alt={product.name}
                            className="absolute inset-0 h-full w-full object-cover opacity-0 group-hover:opacity-100 transition-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <h3
                            className="mb-1 truncate"
                            style={{
                              fontFamily: "Roboto, ui-sans-serif, system-ui, sans-serif",
                              fontWeight: 700,
                              fontSize: "18px",
                              lineHeight: "27px",
                            }}
                          >
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm font-bold uppercase tracking-wider ${
                                product.saleActive
                                  ? "text-red-700 dark:text-red-400"
                                  : "text-neutral-500 dark:text-neutral-400"
                              }`}
                            >
                              {product.saleActive && Number(product.salePercentage) > 0
                                ? formatPrice(
                                    Number(product.price) *
                                      (1 - Number(product.salePercentage) / 100),
                                  )
                                : formatPrice(product.price)}
                            </p>
                            {product.saleActive && Number(product.salePercentage) > 0 && (
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 line-through opacity-70">
                                {formatPrice(product.price)}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center uppercase text-[10px] tracking-widest font-bold text-neutral-400 dark:text-neutral-500">
                  No products found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
