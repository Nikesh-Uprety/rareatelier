import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { fetchProducts, fetchCategories, type ProductApi } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

function ProductsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="aspect-[3/4] bg-neutral-800 rounded-sm animate-pulse" />
          <div className="h-3 w-3/4 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-neutral-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function Products() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = searchParams.get("category");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(initialCategory || "all");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const filters = useMemo(
    () => ({
      category: category === "all" ? undefined : category,
      search: search || undefined,
      minPrice: minPrice !== "" ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== "" ? Number(maxPrice) : undefined,
      sortBy: sortBy,
      page: 1,
    }),
    [category, search, minPrice, maxPrice, sortBy],
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
    let filtered = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "all" || (p.category ?? "") === category;
      
      const price = Number(p.price);
      const matchesMinPrice = minPrice === "" || price >= minPrice;
      const matchesMaxPrice = maxPrice === "" || price <= maxPrice;

      return matchesSearch && matchesCategory && matchesMinPrice && matchesMaxPrice;
    });

    // Apply Sorting
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-high":
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "newest":
      default:
        // Assuming higher ID means newer or we just keep default order
        filtered.sort((a, b) => Number(b.id) - Number(a.id));
        break;
    }

    return filtered;
  }, [products, search, category, minPrice, maxPrice, sortBy]);

  return (
    <div className="container mx-auto px-4 py-20 mt-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">All Products</h1>
      </div>

      <div>
        {/* Glassmorphism Products Container */}
        <div className="rounded-3xl p-6 md:p-10 backdrop-blur-xl bg-white/90 dark:bg-neutral-950/95 border border-black/[0.06] dark:border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-zinc-900 dark:text-white min-h-[400px]">
          <div className="mb-8 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] space-y-4">
            <p 
              style={{ fontFamily: 'Roboto, sans-serif' }}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-neutral-400"
            >
              Showing {filteredProducts.length} results
            </p>

            <div className="w-full overflow-x-auto scrollbar-hide">
              <div className="flex w-max min-w-full items-center justify-center gap-2 px-1 py-1">
                <button
                  onClick={() => setCategory("all")}
                  style={{ fontFamily: "Roboto, sans-serif" }}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                    category === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-transparent text-zinc-600 dark:text-zinc-300 border-black/[0.12] dark:border-white/[0.18] hover:border-primary hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.slug)}
                    style={{ fontFamily: "Roboto, sans-serif" }}
                    className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                      category === cat.slug
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-zinc-600 dark:text-zinc-300 border-black/[0.12] dark:border-white/[0.18] hover:border-primary hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <span 
                style={{ fontFamily: 'Roboto, sans-serif' }}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-neutral-400"
              >
                Sort By
              </span>
              <select 
                style={{ fontFamily: 'Roboto, sans-serif' }}
                className="h-10 pl-4 pr-10 bg-white/50 dark:bg-neutral-900 border border-black/[0.06] dark:border-neutral-800 rounded text-[10px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-black dark:focus:ring-white appearance-none cursor-pointer text-zinc-900 dark:text-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
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
            <>
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredProducts.map((product) => (
                    <Link
                      key={product.id}
                      href={`/product/${product.id}`}
                      className="group block"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-white/[0.04] mb-4 relative rounded-xl border border-white/[0.06] transition-all duration-300 group-hover:border-white/[0.15] group-hover:shadow-[0_8px_24px_rgba(255,255,255,0.06)]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(`/product/${product.id}`, "_blank");
                          }}
                          className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Open product in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        {product.saleActive && Number(product.salePercentage) > 0 && (
                          <div className="absolute top-3 left-3 z-10 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-sm shadow-xl animate-pulse">
                            {product.salePercentage}% OFF
                          </div>
                        )}
                        {product.stock === 0 && (
                          <div className={`absolute ${product.saleActive ? 'top-12' : 'top-3'} left-3 z-10 bg-black/80 dark:bg-neutral-800/90 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded`}>
                            Out of Stock
                          </div>
                        )}
                        <img
                          src={product.imageUrl ?? ""}
                          alt={product.name}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <h3 
                          className="mb-1 truncate transition-colors group-hover:opacity-80"
                          style={{
                            fontFamily: 'Roboto, ui-sans-serif, system-ui, sans-serif',
                            fontWeight: 700,
                            fontSize: '18px',
                            lineHeight: '27px',
                          }}
                        >
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold uppercase tracking-wider ${product.saleActive ? 'text-primary' : 'text-zinc-500 dark:text-neutral-400'}`}>
                            {product.saleActive && Number(product.salePercentage) > 0 
                              ? formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))
                              : formatPrice(product.price)
                            }
                          </p>
                          {product.saleActive && Number(product.salePercentage) > 0 && (
                            <p className="text-[10px] text-zinc-400 dark:text-neutral-500 line-through opacity-60">
                              {formatPrice(product.price)}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center uppercase text-[10px] tracking-widest font-bold text-neutral-400 dark:text-neutral-500">
                  No products found.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}