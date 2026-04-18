import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { deleteAdminImage, fetchAdminImages, type AdminImageAsset } from "@/lib/adminApi";
import { Image as ImageIcon, Loader2, RefreshCcw, Trash2, Eye, CheckCircle2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

type StorefrontLibraryEntry = {
  key: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  provider: "cloudinary" | "tigris";
  id: string;
  category?: string;
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
  const queryClient = useQueryClient();

  const [activeSlot, setActiveSlot] = useState<SlotKey>("feature1");
  const [featureImages, setFeatureImages] = useState<string[]>(
    FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT,
  );
  const [exploreImage, setExploreImage] = useState<string>(EXPLORE_COLLECTION_IMAGE_DEFAULT);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "cloudinary" | "tigris">("all");
  const [imageToDelete, setImageToDelete] = useState<StorefrontLibraryEntry | null>(null);

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

  const imagesQuery = useQuery<StorefrontLibraryEntry[]>({
    queryKey: ["admin", "storefront-image-library", "cloud-only"],
    queryFn: async (): Promise<StorefrontLibraryEntry[]> => {
      const assets = await fetchAdminImages({ limit: 120 });
      return assets
        .filter(
          (asset): asset is AdminImageAsset & { url: string } =>
            Boolean(asset.url) && (asset.provider === "cloudinary" || asset.provider === "tigris"),
        )
        .map((asset) => ({
          key: `${asset.provider}:${asset.id}`,
          id: asset.id,
          filename: asset.filename || asset.publicId || `${asset.provider}-${asset.id.slice(0, 8)}`,
          url: asset.url,
          thumbnailUrl: asset.thumbnailUrl ?? asset.url,
          previewUrl: asset.previewUrl ?? asset.url,
          provider: asset.provider as "cloudinary" | "tigris",
          category: asset.category,
        }));
    },
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (entry: StorefrontLibraryEntry) => {
      await deleteAdminImage(entry.id);
      return entry;
    },
    onSuccess: (deletedEntry) => {
      const deletedUrl = deletedEntry?.url;

      if (deletedUrl) {
        setFeatureImages((prev) =>
          prev.map((url, index) => {
            if (url !== deletedUrl) return url;
            return FEATURE_COLLECTION_IMAGE_SLOTS_DEFAULT[index] ?? "";
          }),
        );
        setExploreImage((prev) =>
          prev === deletedUrl ? EXPLORE_COLLECTION_IMAGE_DEFAULT : prev,
        );
      }

      queryClient.invalidateQueries({ queryKey: ["admin", "storefront-image-library"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "images"] });
      setImageToDelete(null);
      toast({
        title: `${deletedEntry.provider === "cloudinary" ? "Cloudinary" : "Tigris"} image deleted`,
        description: deletedUrl
          ? "Any slot using that image was reset to its default visual."
          : "The image was removed from the library.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items: StorefrontLibraryEntry[] = imagesQuery.data ?? [];
    const providerScoped = providerFilter === "all"
      ? items
      : items.filter((img) => img.provider === providerFilter);
    if (!q) return providerScoped;
    return providerScoped.filter((img) =>
      img.filename.toLowerCase().includes(q) ||
      img.url.toLowerCase().includes(q) ||
      (img.category ?? "").toLowerCase().includes(q),
    );
  }, [imagesQuery.data, providerFilter, search]);

  const groupedImages = useMemo(() => {
    const cloudinary = filtered.filter((img) => img.provider === "cloudinary");
    const tigris = filtered.filter((img) => img.provider === "tigris");
    return { cloudinary, tigris };
  }, [filtered]);

  const libraryByUrl = useMemo(
    () => new Map((imagesQuery.data ?? []).map((img) => [img.url, img])),
    [imagesQuery.data],
  );

  const getLibraryThumbnailUrl = (
    entry?: Pick<StorefrontLibraryEntry, "thumbnailUrl" | "url"> | null,
  ) => entry?.thumbnailUrl ?? entry?.url ?? "";

  const getLibraryPreviewUrl = (
    entry?: Pick<StorefrontLibraryEntry, "previewUrl" | "url"> | null,
  ) => entry?.previewUrl ?? entry?.url ?? "";

  const getResolvedThumbnailUrl = (url?: string | null) => {
    if (!url) return "";
    return getLibraryThumbnailUrl(libraryByUrl.get(url) ?? { url });
  };

  const getResolvedPreviewUrl = (url?: string | null) => {
    if (!url) return "";
    return getLibraryPreviewUrl(libraryByUrl.get(url) ?? { url });
  };

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
            Pick from your cloud-backed admin image library. We still store the slot mapping in
            <code> localStorage</code> for now, but the images themselves now come from Cloudinary or Tigris.
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
                        <img
                          src={getResolvedThumbnailUrl(preview)}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              Active slot preview:
              <div className="mt-2 w-full max-w-2xl rounded-xl overflow-hidden border border-border/60 bg-muted">
                <img
                  src={getResolvedPreviewUrl(slotPreview)}
                  alt="Active slot preview"
                  className="w-full h-56 object-cover"
                  decoding="async"
                />
              </div>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
                Cloud asset delete flow:
                removing an image from the admin library will automatically reset any storefront slot using it back to the default image, then you can save again if you want to keep the updated slot mapping in this browser.
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
            <h2 className="text-base font-black uppercase tracking-wider">Storefront image library</h2>
            <p className="text-muted-foreground mt-1 text-sm">Browse cloud-backed admin images, then assign them to the active storefront slot.</p>
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

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all" as const, label: "All images" },
              { key: "cloudinary" as const, label: "Cloudinary" },
              { key: "tigris" as const, label: "Tigris" },
            ] as const
          ).map((option) => (
            <Button
              key={option.key}
              type="button"
              variant={providerFilter === option.key ? "default" : "outline"}
              className="h-8 rounded-full px-4 text-xs uppercase tracking-[0.2em]"
              onClick={() => setProviderFilter(option.key)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {imagesQuery.isLoading ? (
          <div className="py-10 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            <div className="mt-2 text-sm">Loading images…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No images found.</div>
        ) : (
          <div className="space-y-8">
            {(["cloudinary", "tigris"] as const).map((provider) => {
              const items = groupedImages[provider];
              if (items.length === 0) return null;

              return (
                <div key={provider} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.22em]">
                        {provider === "cloudinary" ? "Cloudinary Library" : "Tigris Library"}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {provider === "cloudinary"
                          ? "Reusable hosted images from your Cloudinary-backed media library."
                          : "Optimized object-storage assets from your Tigris-backed media library."}
                      </p>
                    </div>
                    <span className="rounded-full border border-border/60 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {items.length} image{items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {items.slice(0, 120).map((img) => {
                      const isSelected = currentlySelectedUrls.has(img.url);
                      return (
                        <div
                          key={img.key}
                          className={cn(
                            "group overflow-hidden rounded-2xl border border-border/60 bg-muted/40 transition-colors",
                            isSelected ? "ring-2 ring-emerald-500/30 border-emerald-400/50" : "hover:border-black/30 dark:hover:border-white/20",
                          )}
                          style={{
                            contentVisibility: "auto",
                            containIntrinsicSize: "220px 270px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handlePick(img.url)}
                            className="relative block w-full"
                            aria-label={`Pick ${img.filename}`}
                          >
                            <img
                              src={getLibraryThumbnailUrl(img)}
                              alt={img.filename}
                              className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2">
                              <span className={cn(
                                "rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em]",
                                provider === "cloudinary"
                                  ? "bg-sky-500/85 text-white"
                                  : "bg-emerald-600/85 text-white",
                              )}>
                                {provider}
                              </span>
                              {img.category ? (
                                <span className="rounded-full bg-black/55 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white">
                                  {img.category}
                                </span>
                              ) : null}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-3 py-2 text-left text-white">
                              <div className="truncate text-[11px] font-semibold">{img.filename}</div>
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/80">
                                {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                {isSelected ? "Assigned to a storefront slot" : "Click to assign to active slot"}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-background/90 px-3 py-2">
                            <span className="truncate text-[11px] text-muted-foreground">
                              {img.filename}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1.5 rounded-full px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                              onClick={() => setImageToDelete(img)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 120 ? (
          <div className="text-xs text-muted-foreground">Showing first 120 results. Narrow your search to pick a specific image.</div>
        ) : null}
      </section>

      <DeleteConfirmDialog
        open={!!imageToDelete}
        onOpenChange={(open) => !open && setImageToDelete(null)}
        title="Delete Image"
        subject={imageToDelete?.filename ?? "Storefront image"}
        description={imageToDelete?.provider === "cloudinary"
          ? "This removes the selected image from Cloudinary-backed admin media."
          : "This removes the selected image from Tigris-backed admin media."}
        loading={deleteMutation.isPending}
        loadingText="Deleting image..."
        preview={imageToDelete ? (
          <div className="space-y-4 py-2 text-left">
            <div className="overflow-hidden rounded-[24px] border border-[#FFE1DE] bg-[#FFF7F6]">
              <img
                src={getLibraryPreviewUrl(imageToDelete)}
                alt={imageToDelete.filename}
                className="h-48 w-full object-cover"
                decoding="async"
              />
            </div>
            <div className="rounded-[22px] border border-[#FFE1DE] bg-[#FFF7F6] px-4 py-3 text-sm text-[#4F4F4F]">
              <p className="font-semibold text-[#212121]">{imageToDelete.filename}</p>
              <p className="mt-1 text-xs text-[#777777]">{`${imageToDelete.provider} • ${imageToDelete.category ?? "uncategorized"}`}</p>
            </div>
          </div>
        ) : null}
        warning={imageToDelete && currentlySelectedUrls.has(imageToDelete.url) ? (
          <div className="rounded-[22px] border border-[#FFD7A8] bg-[#FFF6E8] px-4 py-3 text-left text-sm text-[#8A4B08] dark:border-[#6B3A05] dark:bg-[#2C1C0A] dark:text-[#FFD39B]">
            This image is currently assigned to a storefront slot. Deleting it will reset that slot to the default image.
          </div>
        ) : null}
        onConfirm={() => {
          if (imageToDelete) deleteMutation.mutate(imageToDelete);
        }}
      />
    </div>
  );
}
