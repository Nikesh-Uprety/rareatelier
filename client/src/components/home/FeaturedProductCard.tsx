import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";

import { formatPrice } from "@/lib/format";
import { type ProductApi } from "@/lib/api";
import {
  buildStorefrontPresetImageUrl,
  getStorefrontImagePresetOptions,
  getStorefrontProductImageSources,
} from "@/lib/storefrontImage";

const FEATURED_STATIC_IMAGES = [
  "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc03423-6408.webp",
  "https://cdn2.blanxer.com/uploads/67cd36dcf133882caba612b4/product_image-dsc02288-edit-2-8008.webp",
];

const DUMMY_NEW_ARRIVAL_IMAGES = [
  "https://placehold.co/900x1200/0b1020/ffffff?text=RARE+ALT+1",
  "https://placehold.co/900x1200/111827/ffffff?text=RARE+ALT+2",
  "https://placehold.co/900x1200/0f172a/ffffff?text=RARE+ALT+3",
];
const FEATURED_PRODUCT_CARD_SIZES =
  "(max-width: 1024px) 88vw, (max-width: 1440px) 32vw, 26vw";
const FEATURED_PRODUCT_PRIMARY_DIMENSIONS = getStorefrontImagePresetOptions("productCardPrimary");
const FEATURED_PRODUCT_SECONDARY_DIMENSIONS = getStorefrontImagePresetOptions("productCardSecondary");

function getGalleryImagesForCard(
  product: ProductApi,
  { addDummyFallback }: { addDummyFallback: boolean },
) {
  const all = getStorefrontProductImageSources(product.imageUrl, product.galleryUrls);
  if (!addDummyFallback) return all.length > 0 ? all : [product.imageUrl ?? ""].filter(Boolean);

  if (all.length >= 2) return all;
  return [...all, ...DUMMY_NEW_ARRIVAL_IMAGES].filter(Boolean);
}

function FeaturedProductCard({
  product,
  index,
}: {
  product: ProductApi;
  index: number;
}) {
  const [mobileImageIndex, setMobileImageIndex] = useState(0);
  const touchStartX = useRef(0);
  const autoCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didSwipeRef = useRef(false);

  const galleryImages = getStorefrontProductImageSources(product.imageUrl, product.galleryUrls);
  const resolvedGalleryImages = galleryImages.length
    ? galleryImages
    : getGalleryImagesForCard(product, { addDummyFallback: true });
  const optimizedGalleryImages = resolvedGalleryImages.map((src, imageIndex) =>
    buildStorefrontPresetImageUrl(
      src,
      imageIndex === 0 ? "productCardPrimary" : "productCardSecondary",
    ) || src,
  );

  const startAutoCycle = useCallback(() => {
    if (optimizedGalleryImages.length <= 1) return;
    if (autoCycleRef.current) clearInterval(autoCycleRef.current);
    autoCycleRef.current = setInterval(() => {
      setMobileImageIndex((prev) => (prev + 1) % optimizedGalleryImages.length);
    }, 2000);
  }, [optimizedGalleryImages.length]);

  useEffect(() => {
    startAutoCycle();
    return () => {
      if (autoCycleRef.current) clearInterval(autoCycleRef.current);
    };
  }, [startAutoCycle]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    if (autoCycleRef.current) {
      clearInterval(autoCycleRef.current);
      autoCycleRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (optimizedGalleryImages.length <= 1) {
      startAutoCycle();
      return;
    }
    if (Math.abs(deltaX) > 50) {
      didSwipeRef.current = true;
      setMobileImageIndex((prev) => {
        if (deltaX < 0) return (prev + 1) % optimizedGalleryImages.length;
        return (prev - 1 + optimizedGalleryImages.length) % optimizedGalleryImages.length;
      });
      setTimeout(() => {
        didSwipeRef.current = false;
      }, 400);
    }
    startAutoCycle();
  };

  const handleGalleryClick = (e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const staticImage =
    FEATURED_STATIC_IMAGES[index] ?? resolvedGalleryImages[1] ?? resolvedGalleryImages[0] ?? "";
  const desktopPrimaryImage =
    buildStorefrontPresetImageUrl(staticImage, "productCardPrimary") || staticImage;
  const desktopSecondaryImage =
    buildStorefrontPresetImageUrl(resolvedGalleryImages[0], "productCardSecondary") ||
    resolvedGalleryImages[0] ||
    desktopPrimaryImage;

  return (
    <Link href={`/product/${product.id}`} className="group cursor-pointer relative">
      <div className="relative overflow-hidden bg-gray-50 dark:bg-muted/30 aspect-[4/5] rounded-xl shadow-xl transition-all duration-300 hover:shadow-white/5 md:shadow-2xl">
        <div className="hidden lg:block absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.div
              className="absolute inset-0 z-0"
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
            >
              <img
                src={desktopPrimaryImage}
                alt={`${product.name} lifestyle`}
                className="w-full h-full object-cover transition-opacity duration-1000 ease-in-out group-hover:opacity-0"
                loading={index < 2 ? "eager" : "lazy"}
                decoding={index < 2 ? "sync" : "async"}
                fetchPriority={index < 2 ? "high" : "auto"}
                width={FEATURED_PRODUCT_PRIMARY_DIMENSIONS.width}
                height={FEATURED_PRODUCT_PRIMARY_DIMENSIONS.height}
                sizes={FEATURED_PRODUCT_CARD_SIZES}
              />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ease-in-out">
                <img
                  src={desktopSecondaryImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={FEATURED_PRODUCT_SECONDARY_DIMENSIONS.width}
                  height={FEATURED_PRODUCT_SECONDARY_DIMENSIONS.height}
                  sizes={FEATURED_PRODUCT_CARD_SIZES}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          className="lg:hidden absolute inset-0 z-0 touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleGalleryClick}
        >
          {optimizedGalleryImages.map((src, imgIdx) => (
            <div
              key={`${src}-${imgIdx}`}
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              style={{ opacity: imgIdx === mobileImageIndex ? 1 : 0 }}
            >
              <img
                src={src}
                alt={`${product.name} view ${imgIdx + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 && imgIdx === 0 ? "eager" : "lazy"}
                decoding={index === 0 && imgIdx === 0 ? "sync" : "async"}
                fetchPriority={index === 0 && imgIdx === 0 ? "high" : "auto"}
                width={
                  imgIdx === 0
                    ? FEATURED_PRODUCT_PRIMARY_DIMENSIONS.width
                    : FEATURED_PRODUCT_SECONDARY_DIMENSIONS.width
                }
                height={
                  imgIdx === 0
                    ? FEATURED_PRODUCT_PRIMARY_DIMENSIONS.height
                    : FEATURED_PRODUCT_SECONDARY_DIMENSIONS.height
                }
                sizes={FEATURED_PRODUCT_CARD_SIZES}
              />
            </div>
          ))}
          {optimizedGalleryImages.length > 1 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {optimizedGalleryImages.map((_, dotIdx: number) => (
                <div
                  key={dotIdx}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    dotIdx === mobileImageIndex ? "w-5 bg-white shadow-lg" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none z-10" />

        <div className="hidden lg:flex absolute inset-x-4 bottom-4 z-20 p-6 backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl shadow-xl justify-between items-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 ease-out">
          <div>
            <h3 className="text-white text-xl font-black uppercase tracking-tighter mb-1">
              {product.name}
            </h3>
            {product.saleActive && Number(product.salePercentage) > 0 ? (
              <div className="flex items-center gap-2">
                <p className="text-white font-black text-lg">
                  {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                </p>
                <p className="text-white/50 font-medium text-sm line-through">
                  {formatPrice(product.price)}
                </p>
                <span className="bg-white text-black text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded-sm">
                  {product.salePercentage}% OFF
                </span>
              </div>
            ) : (
              <p className="text-white/70 font-medium text-lg">{formatPrice(product.price)}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        <div className="lg:hidden absolute inset-x-2.5 bottom-2.5 z-20 p-3 backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm text-white font-black uppercase tracking-tighter mb-0.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {product.name}
              </h3>
              {product.saleActive && Number(product.salePercentage) > 0 ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <p className="text-white font-black text-[13px]">
                    {formatPrice(Number(product.price) * (1 - Number(product.salePercentage) / 100))}
                  </p>
                  <p className="text-white/50 font-medium text-xs line-through">
                    {formatPrice(product.price)}
                  </p>
                  <span className="bg-white text-black text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-sm">
                    {product.salePercentage}% OFF
                  </span>
                </div>
              ) : (
                <p className="text-white/70 font-medium text-[13px] animate-in fade-in slide-in-from-bottom-2 duration-700">
                  {formatPrice(product.price)}
                </p>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`/product/${product.id}`, "_blank");
          }}
          className="absolute top-4 right-4 z-30 hidden lg:flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </Link>
  );
}

export { getGalleryImagesForCard, FeaturedProductCard };
