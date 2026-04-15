import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchProducts, type ProductApi } from "@/lib/api";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import ThreeDHoverGallery from "@/components/ui/3d-hover-gallery";
import { useToast } from "@/hooks/use-toast";
import { useThemeStore } from "@/store/theme";
import StorefrontCardImage from "@/components/storefront/StorefrontCardImage";
import { buildStorefrontPresetImageUrl } from "@/lib/storefrontImage";

type SiteAsset = {
  id: string;
  imageUrl: string | null;
  videoUrl: string | null;
  altText: string | null;
  sortOrder: number | null;
  active: boolean | null;
};

const COLLECTION_CARD_ASPECT = "aspect-[4/5]";
const COLLECTION_IMAGE_SIZES =
  "(max-width: 768px) 48vw, (max-width: 1280px) 31vw, (max-width: 1600px) 23vw, 18vw";

function parseGalleryUrls(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function RevealImage({
  product,
  index,
  isDark,
}: {
  product: ProductApi;
  index: number;
  isDark: boolean;
}) {
  const gallery = useMemo(() => parseGalleryUrls(product.galleryUrls), [product.galleryUrls]);
  const primaryImage = product.imageUrl ?? gallery[0] ?? "";
  const secondaryImage = gallery.length > 1 ? gallery[1] : null;
  const shouldPrioritize = index < 6;

  const salePercentage = useMemo(() => {
    if (!product.originalPrice || Number(product.originalPrice) <= product.price) return null;
    const orig = Number(product.originalPrice);
    const curr = product.price;
    return Math.round(((orig - curr) / orig) * 100);
  }, [product.originalPrice, product.price]);

  return (
    <div
      className="group"
      style={
        index > 7
          ? { contentVisibility: "auto", containIntrinsicSize: "520px" }
          : undefined
      }
    >
      <Link href={`/product/${product.id}`} className="group block overflow-hidden rounded-sm">
        <StorefrontCardImage
          primarySrc={primaryImage}
          secondarySrc={secondaryImage}
          alt={product.name}
          ratio={4 / 5}
          sizes={COLLECTION_IMAGE_SIZES}
          prioritize={shouldPrioritize}
          primaryPreset="collectionCard"
          secondaryPreset="collectionCard"
          aspectClassName="rounded-sm bg-neutral-100 dark:bg-neutral-800"
          imageClassName="object-cover"
          imageStyle={{
            filter: isDark ? "saturate(0.96) contrast(1.02)" : "saturate(1.08) contrast(1.03) brightness(1.01)",
          }}
          renderOverlay={({ isHovered }) => (
            <>
              {salePercentage ? (
                <div className="absolute left-3 top-3 z-10 rounded-sm border border-red-500 bg-red-600 px-3 py-1.5 shadow-lg shadow-red-900/30">
                  <span className="text-xs font-black uppercase italic tracking-widest text-white">
                    -{salePercentage}% OFF
                  </span>
                </div>
              ) : null}

              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/85 via-black/22 to-transparent transition-opacity duration-300 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              >
                <div
                  className={`absolute bottom-0 left-0 right-0 p-6 transition-transform duration-300 sm:p-7 ${
                    isHovered ? "translate-y-0" : "translate-y-3"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.34em] text-white/88 drop-shadow-md">
                      View Collection
                    </span>
                    <h3 className="text-lg font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-xl">
                      {product.name}
                    </h3>
                  </div>
                </div>

                <div
                  className={`absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl transition-all duration-300 ${
                    isHovered ? "scale-100 opacity-100" : "scale-75 opacity-0"
                  }`}
                >
                  <ArrowUpRight className="h-4 w-4 text-black" />
                </div>
              </div>
            </>
          )}
        />
      </Link>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1540px] px-3 py-14 md:px-6 md:py-20 xl:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-5 2xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`${COLLECTION_CARD_ASPECT} rounded-sm bg-neutral-100 animate-pulse dark:bg-neutral-800`}
          />
        ))}
      </div>
    </div>
  );
}

export default function NewCollection() {
  const { toast } = useToast();
  const { theme } = useThemeStore();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const isDark = theme === "dark";
  const { data: productsData, isLoading } = useQuery<{ products: ProductApi[]; total: number }>({
    queryKey: ["products", "all-collection"],
    queryFn: () => fetchProducts(),
    staleTime: 1000 * 60 * 5, // 5 minutes stale time for better performance
  });

  const products = productsData?.products ?? [];

  const { data: bannerAssets = [] } = useQuery<SiteAsset[]>({
    queryKey: ["site-assets", "collection_page"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/site-assets/collection_page");
      const json = await res.json();
      return json.data ?? [];
    },
  });


  const sortedProducts = useMemo(() => {
    if (!products) return [];
    return [...products]
      .filter((product) => Boolean(product.imageUrl || parseGalleryUrls(product.galleryUrls)[0]))
      .sort((a, b) => {
        const rankA = a.ranking ?? 999;
        const rankB = b.ranking ?? 999;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
  }, [products]);

  const heroGalleryImages = useMemo(() => {
    const imageAssets = (bannerAssets ?? [])
      .filter((a) => a?.active && a?.imageUrl)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((a) => a.imageUrl as string);

    // Keep the hero snappy and predictable.
    const maxItems = 8;
    
    // If we have banner assets, use them (up to maxItems)
    if (imageAssets.length > 0) {
      return imageAssets.slice(0, maxItems).map((image) =>
        buildStorefrontPresetImageUrl(image, "collectionCard", {
          width: 960,
          height: 1200,
          quality: 72,
        }) || image,
      );
    }

    // Otherwise, use default images for a beautiful gallery
    return [
      "/images/collection-banner.png",
      "/images/feature1.webp",
      "/images/feature2.webp",
      "/images/feature3.webp",
      "/images/landingpage3.webp",
      "/images/landingpage4.webp",
      "/images/explore.webp",
      "/images/colllection.webp",
    ].slice(0, maxItems);
  }, [bannerAssets]);

  const [shouldLoadInstagram, setShouldLoadInstagram] = useState(false);
  const instagramEmbedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = instagramEmbedRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadInstagram(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "800px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadInstagram) return;

    const scriptId = "instagram-embed-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const processEmbeds = () => {
      const instagram = (window as Window & { instgrm?: { Embeds?: { process?: () => void } } }).instgrm;
      instagram?.Embeds?.process?.();
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        processEmbeds();
      } else {
        existingScript.addEventListener("load", processEmbeds, { once: true });
      }
      return () => {
        existingScript.removeEventListener("load", processEmbeds);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      processEmbeds();
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [shouldLoadInstagram]);

  const newsletterMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/newsletter/subscribe", { email });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscribed!",
        description: "You’re on the list for new drops and rare updates.",
      });
      setNewsletterEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newsletterEmail.trim()) return;
    newsletterMutation.mutate(newsletterEmail.trim());
  };

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfa_24%,#f5f1ea_68%,#ffffff_100%)] text-black dark:bg-black dark:text-white">
      {/* Hero Banner — Full-bleed background image + Text */}
      <section className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_top,#fffdf8_0%,#f5efe5_42%,#ece4d7_100%)] dark:bg-black">
        <div className="relative w-full h-screen md:h-screen lg:h-screen">
          <div className="absolute inset-0">
            <ThreeDHoverGallery
              images={heroGalleryImages}
              className="h-full w-full"
              backgroundColor="transparent"
              itemWidth={10}
              itemHeight={18}
              activeWidth={40}
              gap={0.8}
              perspective={50}
              hoverScale={15}
              transitionDuration={0.3}
              rotationAngle={35}
              zDepth={10}
              grayscaleStrength={isDark ? 1 : 0}
              brightnessLevel={isDark ? 0.5 : 0.95}
              enableKeyboardNavigation={true}
              autoPlay={false}
            />
          </div>

          {/* Hero text overlay - no dark overlays */}
          <div className="relative z-10 container mx-auto px-4 md:px-6 h-full flex items-center pointer-events-none">
            <div className="w-full flex flex-col items-center text-center py-16 md:py-24">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 0.85, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="mb-4 text-[10px] font-bold uppercase tracking-[0.55em] text-white/90 md:mb-6 md:text-xs"
                style={{
                  textShadow: isDark ? "0 10px 25px rgba(0,0,0,0.55)" : "0 10px 24px rgba(0,0,0,0.42)",
                }}
              >
                Curated Pieces, Captured in Detail
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif text-5xl font-bold leading-none tracking-tight text-white sm:text-7xl md:text-8xl lg:text-9xl"
                style={{
                  textShadow: "0 14px 40px rgba(0,0,0,0.55)",
                }}
              >
                The Collection
              </motion.h1>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.75 }}
                className="mt-6 md:mt-8 flex items-center gap-3"
              >
                <div className="h-px w-12 bg-white/35 md:w-16" />
                <span className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/70 md:text-xs">
                  {products ? products.length : "—"} Pieces
                </span>
                <div className="h-px w-12 bg-white/35 md:w-16" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="pb-16 pt-0 md:pb-24">
        {isLoading ? (
          <GallerySkeleton />
        ) : (
          <div className="mx-auto w-full max-w-[1540px] px-3 md:px-6 xl:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-5 2xl:grid-cols-5">
              {sortedProducts.map((product, i) => (
                <div key={product.id}>
                  <RevealImage product={product} index={i} isDark={isDark} />
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && products && products.length === 0 && (
          <div className="py-20 text-center">
            <p className="uppercase text-[10px] tracking-widest font-bold text-neutral-400">
              No products found.
            </p>
          </div>
        )}
      </section>

      {/* Instagram + Newsletter */}
      <section className="border-t border-border/40 py-16 md:py-24">
        <div className="container mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-start"
            >
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.5em] text-muted-foreground md:text-xs">
                Follow Us
              </p>
              <div
                ref={instagramEmbedRef}
                className="mt-2 w-full max-w-[540px] overflow-hidden rounded-[28px] border border-border/60 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.10)] dark:bg-neutral-950"
              >
                {!shouldLoadInstagram ? (
                  <div className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-28 rounded bg-neutral-200/80 dark:bg-neutral-800/70" />
                      <div className="h-3 w-20 rounded bg-neutral-200/70 dark:bg-neutral-800/60" />
                      <div className="mt-4 aspect-square w-full rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/50" />
                      <div className="h-4 w-40 rounded bg-neutral-200/70 dark:bg-neutral-800/60" />
                    </div>
                  </div>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        `<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/Cxr8j_kuyz_/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><a href="https://www.instagram.com/p/Cxr8j_kuyz_/?utm_source=ig_embed&amp;utm_campaign=loading" target="_blank" rel="noreferrer">View this post on Instagram</a></blockquote>`,
                    }}
                  />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
              className="relative overflow-hidden rounded-[32px] border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),rgba(244,240,234,0.88)_35%,rgba(234,228,220,0.92)_100%)] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.10)] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,34,34,0.95),rgba(18,18,18,0.98)_48%,rgba(10,10,10,1)_100%)] sm:p-9"
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_40%,rgba(185,147,86,0.14))]" />
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[rgba(185,147,86,0.18)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 left-8 h-28 w-28 rounded-full bg-black/8 blur-3xl dark:bg-white/10" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  Newsletter
                </div>
                <h3 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Subscribe for early access.
                </h3>
                <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                  Get new-collection previews, atelier stories, and drop alerts before everyone else.
                </p>

                <form onSubmit={handleNewsletterSubmit} className="mt-8 space-y-4">
                  <div className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(event) => setNewsletterEmail(event.target.value)}
                      placeholder="Enter your email"
                      className="h-12 flex-1 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                    <button
                      type="submit"
                      disabled={newsletterMutation.isPending}
                      className="inline-flex h-12 items-center gap-2 rounded-[18px] bg-black px-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-all duration-300 hover:translate-x-0.5 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                    >
                      {newsletterMutation.isPending ? "Joining" : "Join"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[11px] text-muted-foreground">
                    <span>Thoughtful updates only. No spam.</span>
                    <span className="uppercase tracking-[0.2em]">Rare Atelier</span>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
    </div>
  );
}
