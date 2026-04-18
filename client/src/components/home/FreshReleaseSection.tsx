import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import StorefrontCardImage from "@/components/storefront/StorefrontCardImage";
import { fetchProducts, type ProductApi } from "@/lib/api";
import { formatStorefrontPrice as formatPrice } from "@/lib/format";
import { getStorefrontProductImageSources } from "@/lib/storefrontImage";

interface FreshReleaseSectionProps {
  config?: Record<string, any>;
}

const FRESH_RELEASE_CARD_SIZES =
  "(max-width: 640px) 92vw, (max-width: 1280px) 44vw, (max-width: 1600px) 30vw, 23vw";

function FreshReleaseCard({ product, index }: { product: ProductApi; index: number }) {
  const productImages = getStorefrontProductImageSources(product.imageUrl, product.galleryUrls);
  const primaryImage = productImages[0] ?? "";
  const secondaryImage = productImages[1] ?? null;

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block overflow-hidden rounded-2xl border border-border/60 bg-card transition-all hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="overflow-hidden bg-muted/30">
        {primaryImage ? (
          <StorefrontCardImage
            primarySrc={primaryImage}
            secondarySrc={secondaryImage}
            alt={product.name}
            ratio={4 / 5}
            sizes={FRESH_RELEASE_CARD_SIZES}
            prioritize={index < 2}
            aspectClassName="rounded-none bg-muted/30"
            imageClassName="object-cover group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex aspect-[4/5] h-full w-full items-center justify-center text-xs uppercase tracking-[0.24em] text-muted-foreground">
            No Image
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground">
            {product.name}
          </h3>
          {product.saleActive ? (
            <span className="shrink-0 rounded-full bg-red-500 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
              Sale
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[var(--gold)] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--bg)]">
              New
            </span>
          )}
        </div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--gold)]">
          {formatPrice(product.price)}
        </p>
        {product.shortDetails ? (
          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {product.shortDetails}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export default function FreshReleaseSection({ config }: FreshReleaseSectionProps) {
  const productIds = Array.isArray(config?.productIds)
    ? config.productIds.map((id: unknown) => String(id))
    : [];
  const productFetchLimit = productIds.length > 0
    ? Math.min(Math.max(productIds.length * 2, 24), 200)
    : 24;

  const { data: productsData = { products: [], total: 0 } } = useQuery<{ products: ProductApi[]; total: number }>({
    queryKey: ["products", "fresh-release", { limit: productFetchLimit, productIds }],
    queryFn: () => fetchProducts({ limit: productFetchLimit }),
    staleTime: 60 * 1000,
  });

  const products = productsData.products;

  const resolvedConfig = config ?? {};
  const title = resolvedConfig.title ?? "Fresh Release";
  const text =
    resolvedConfig.text ?? "A selected grid of recent pieces with enough room to highlight product density and clean merchandising.";
  const desktopColumns = Number.isFinite(Number(resolvedConfig.columns))
    ? Math.max(2, Math.min(4, Number(resolvedConfig.columns)))
    : 4;

  const selectedProducts = useMemo(() => {
    const source = productIds.length > 0
      ? products.filter((product) => productIds.includes(String(product.id)))
      : products.slice(0, 8);
    return source.slice(0, 16);
  }, [productIds, products]);

  const desktopGridClass =
    desktopColumns === 2
      ? "xl:grid-cols-2"
      : desktopColumns === 3
        ? "xl:grid-cols-3"
        : "xl:grid-cols-4";

  return (
    <section className="px-6 py-24 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <div className="max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--gold)]">
            Curated Drop
          </p>
          <h2
            className="mt-4 text-balance"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(34px, 5vw, 64px)",
              lineHeight: 1,
            }}
          >
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            {text}
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${desktopGridClass}`}>
          {selectedProducts.map((product, index) => (
            <FreshReleaseCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
