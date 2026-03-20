import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Loader2, RefreshCcw } from "lucide-react";

type StorefrontImageEntry = {
  filename: string;
  url: string;
  relPath: string;
};

type SlotKey = "feature1" | "feature2" | "feature3" | "explore";

const FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT = [
  "/images/feature1.webp",
  "/images/feature2.webp",
  "/images/feature3.webp",
];
const EXPLORE_COLLECTION_IMAGE_DEFAULT = "/images/explore.webp";

function safeParseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function StorefrontImagePicker() {
  const { toast } = useToast();

  const [activeSlot, setActiveSlot] = useState<SlotKey>("feature1");
  const [featureImages, setFeatureImages] = useState<string[]>(
    FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT,
  );
  const [exploreImage, setExploreImage] = useState<string>(EXPLORE_COLLECTION_IMAGE_DEFAULT);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const parsedFeatures = safeParseJson(localStorage.getItem("storefront_feature_images"));
    if (Array.isArray(parsedFeatures) && parsedFeatures.length > 0) {
      const normalized = parsedFeatures
        .map((x) => (typeof x === "string" ? x : ""))
        .filter(Boolean);
      if (normalized.length > 0) setFeatureImages(normalized.slice(0, 3));
    }

    const parsedExplore = localStorage.getItem("storefront_explore_image");
    if (parsedExplore && typeof parsedExplore === "string") {
      setExploreImage(parsedExplore);
    }
  }, []);

  const imagesQuery = useQuery<StorefrontImageEntry[]>({
    queryKey: ["admin", "storefront-image-library"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/storefront-image-library");
      const json = await res.json();
      return (json.data as StorefrontImageEntry[]) ?? [];
    },
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = imagesQuery.data ?? [];
    if (!q) return items;
    return items.filter((img) => img.filename.toLowerCase().includes(q) || img.url.toLowerCase().includes(q));
  }, [imagesQuery.data, search]);

  const slotPreview = useMemo(() => {
    if (activeSlot === "feature1") return featureImages[0] ?? FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT[0];
    if (activeSlot === "feature2") return featureImages[1] ?? FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT[1];
    if (activeSlot === "feature3") return featureImages[2] ?? FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT[2];
    return exploreImage || EXPLORE_COLLECTION_IMAGE_DEFAULT;
  }, [activeSlot, exploreImage, featureImages]);

  const handlePick = (url: string) => {
    if (activeSlot === "explore") {
      setExploreImage(url);
      return;
    }

    const idx = activeSlot === "feature1" ? 0 : activeSlot === "feature2" ? 1 : 2;
    setFeatureImages((prev) => {
      const next = [...prev];
      next[idx] = url;
      return next;
    });
  };

  const handleSave = () => {
    localStorage.setItem("storefront_feature_images", JSON.stringify(featureImages.slice(0, 3)));
    localStorage.setItem("storefront_explore_image", exploreImage);
    toast({
      title: "Storefront images saved",
      description: "Open the storefront home page to see the changes.",
    });
  };

  const handleReset = () => {
    localStorage.removeItem("storefront_feature_images");
    localStorage.removeItem("storefront_explore_image");
    setFeatureImages(FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT);
    setExploreImage(EXPLORE_COLLECTION_IMAGE_DEFAULT);
    toast({ title: "Reset to defaults" });
  };

  const currentlySelectedUrls = new Set([
    featureImages[0],
    featureImages[1],
    featureImages[2],
    exploreImage,
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-medium text-[#2C3E2D] dark:text-foreground flex items-center gap-3">
            <ImageIcon className="h-7 w-7" />
            Storefront Images
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick local images from the server&apos;s <code>uploads/</code> folder. We store your mapping in
            <code> localStorage</code> for now (upload is not available on Railway free plans).
          </p>
        </div>
      </div>

      {/* Slot selectors */}
      <section className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  { key: "feature1" as const, label: "Feature 1" },
                  { key: "feature2" as const, label: "Feature 2" },
                  { key: "feature3" as const, label: "Feature 3" },
                  { key: "explore" as const, label: "Explore" },
                ] as const
              ).map((slot) => {
                const isActive = activeSlot === slot.key;
                const preview =
                  slot.key === "explore"
                    ? exploreImage
                    : slot.key === "feature1"
                      ? featureImages[0]
                      : slot.key === "feature2"
                        ? featureImages[1]
                        : featureImages[2];

                return (
                  <button
                    key={slot.key}
                    type="button"
                    onClick={() => setActiveSlot(slot.key)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                      isActive
                        ? "border-black/40 bg-black/5 dark:bg-white/5"
                        : "border-border/60 hover:border-border",
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-widest">{slot.label}</span>
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/60 bg-muted shrink-0">
                      {preview ? (
                        <img src={preview} alt={slot.label} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Active slot preview:
              <div className="mt-2 w-full max-w-2xl rounded-xl overflow-hidden border border-border/60 bg-muted">
                <img src={slotPreview} alt="Active slot preview" className="w-full h-56 object-cover" />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-96 shrink-0">
            <div className="space-y-3">
              <Button className="w-full" onClick={handleSave}>
                Save Selection
              </Button>
              <Button variant="outline" className="w-full" onClick={handleReset}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Reset Defaults
              </Button>
              <div className="text-xs text-muted-foreground leading-relaxed">
                After saving, open <code>/</code>. The Home page reads these values and updates the Featured + Explore images.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Available images */}
      <section className="bg-white dark:bg-card rounded-2xl border border-[#E5E5E0] dark:border-border p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider">Available uploads</h2>
            <p className="text-muted-foreground mt-1 text-sm">Filtered by extension (.webp/.png/.jpg/.jpeg).</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename…"
              className="h-9"
            />
          </div>
        </div>

        {imagesQuery.isLoading ? (
          <div className="py-10 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            <div className="mt-2 text-sm">Loading images…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No images found.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.slice(0, 120).map((img) => {
              const isSelected = currentlySelectedUrls.has(img.url);
              return (
                <button
                  key={img.relPath}
                  type="button"
                  onClick={() => handlePick(img.url)}
                  className={cn(
                    "relative group rounded-xl overflow-hidden border border-border/60 bg-muted hover:border-black/40 dark:hover:border-white/20 transition-colors",
                    isSelected ? "ring-2 ring-black/20 dark:ring-white/20" : "",
                  )}
                  aria-label={`Pick ${img.filename}`}
                >
                  <img src={img.url} alt={img.filename} className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.filename}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filtered.length > 120 ? (
          <div className="text-xs text-muted-foreground">Showing first 120 results. Narrow your search to pick a specific image.</div>
        ) : null}
      </section>
    </div>
  );
}

