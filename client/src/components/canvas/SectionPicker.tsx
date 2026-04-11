import { useMemo, useState } from "react";
import { Check, Search, Sparkles, Wand2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  SECTION_CATEGORY_META,
  SECTION_TYPES,
  type SectionCategory,
  type SectionType,
  type SectionTypeDefinition,
} from "@/lib/sectionTypes";

type PickerCategory = "all" | SectionCategory;

interface SectionPickerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onAdd: (sectionType: SectionType) => void;
  existingSectionTypes?: SectionType[];
}

const CATEGORY_ART: Record<SectionCategory, string> = {
  hero: "/images/landingpage3.webp",
  products: "/images/stussy.webp",
  content: "/images/home-campaign-editorial.webp",
  media: "/images/feature2.webp",
  interactive: "/images/feature3.webp",
  utility: "/images/about.webp",
};

const SECTION_ART_OVERRIDES: Partial<Record<SectionType, string>> = {
  "hero-video": "/images/rarev2hero.jpeg",
  "hero-lookbook": "/images/home-campaign-editorial.webp",
  "hero-poster": "/images/collection-banner.png",
  "featured-products": "/images/stussy.webp",
  "new-arrivals": "/images/collection-banner.png",
  "category-grid": "/images/colllection.webp",
  gallery: "/images/feature2.webp",
  "gallery-masonry": "/images/feature1.webp",
  "gallery-collage": "/images/feature3.webp",
  "gallery-lookbook": "/images/home-campaign-editorial.webp",
  video: "/images/rarev2hero.jpeg",
  testimonial: "/images/about.webp",
  "testimonial-cards": "/images/about.webp",
  "testimonial-marquee": "/images/about.webp",
  faq: "/images/about.webp",
  contact: "/images/about.webp",
  services: "/images/easy-exchange-final.png",
  "services-dark": "/images/easy-exchange-final.png",
};

const QUICK_PICK_TYPES: SectionType[] = [
  "hero-slider",
  "featured-products",
  "gallery",
  "campaign-banner",
  "services",
  "faq",
];

function getPreviewArtwork(section: SectionTypeDefinition) {
  return SECTION_ART_OVERRIDES[section.type] ?? CATEGORY_ART[section.category];
}

function PreviewShell({
  section,
}: {
  section: SectionTypeDefinition;
}) {
  const artwork = getPreviewArtwork(section);
  const tint =
    section.category === "hero"
      ? "from-black/18 via-black/42 to-black/78"
      : section.category === "products"
        ? "from-white/10 via-black/30 to-black/68"
        : section.category === "media"
          ? "from-black/16 via-black/36 to-black/72"
          : "from-white/18 via-black/22 to-black/64";

  const headline = section.label;
  const meta = section.category.toUpperCase();

  if (section.category === "products") {
    return (
      <div className="relative h-[190px] overflow-hidden rounded-[26px] border border-slate-200 bg-[#f8fafc] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.65)_0%,rgba(255,255,255,0.08)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[92px] bg-cover bg-center" style={{ backgroundImage: `url(${artwork})` }} />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between text-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/88">{meta}</div>
            <div className="mt-1 text-sm font-semibold">{headline}</div>
          </div>
          <div className="rounded-full border border-white/30 bg-white/18 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em]">
            Live
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => (
            <div key={`${section.type}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="h-16 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${artwork})` }} />
              <div className="mt-2 h-2 rounded-full bg-slate-900/80" />
              <div className="mt-1 h-2 w-2/3 rounded-full bg-slate-300" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.category === "media") {
    return (
      <div className="relative h-[190px] overflow-hidden rounded-[26px] border border-slate-200 bg-white">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artwork})` }} />
        <div className={cn("absolute inset-0 bg-gradient-to-br", tint)} />
        <div className="absolute inset-4 grid grid-cols-[1.25fr_0.9fr] gap-3">
          <div className="rounded-[22px] border border-white/20 bg-white/10 backdrop-blur-[2px]" />
          <div className="grid gap-3">
            <div className="rounded-[20px] border border-white/20 bg-white/12" />
            <div className="rounded-[20px] border border-white/20 bg-white/8" />
          </div>
        </div>
        <div className="absolute left-4 top-4 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-white">
          {meta}
        </div>
      </div>
    );
  }

  if (section.category === "interactive") {
    return (
      <div className="relative h-[190px] overflow-hidden rounded-[26px] border border-slate-200 bg-[#0e1318]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(108,140,255,0.35),transparent_40%),linear-gradient(180deg,#0f172a_0%,#091018_100%)]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between text-white">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-200/90">{meta}</div>
            <div className="mt-1 text-sm font-semibold">{headline}</div>
          </div>
          <Wand2 className="h-4 w-4 text-sky-200/80" />
        </div>
        <div className="absolute inset-x-4 bottom-4 space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={`${section.type}-${row}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-white/80">
              <div className="h-2.5 w-28 rounded-full bg-white/75" />
              <div className="h-6 w-6 rounded-full border border-white/15 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.category === "utility") {
    return (
      <div className="relative h-[190px] overflow-hidden rounded-[26px] border border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)]" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{meta}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{headline}</div>
          </div>
          <div className="rounded-full bg-slate-900 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white">Utility</div>
        </div>
        <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${artwork})` }} />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-20 rounded-full bg-slate-900/85" />
              <div className="h-2.5 w-32 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[190px] overflow-hidden rounded-[26px] border border-slate-200 bg-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${artwork})` }} />
      <div className={cn("absolute inset-0 bg-gradient-to-br", tint)} />
      <div className="absolute inset-x-4 top-4 flex items-start justify-between text-white">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/80">{meta}</div>
          <div className="mt-2 max-w-[180px] text-lg font-semibold leading-tight">{headline}</div>
        </div>
        <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">
          Preview
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur-[3px]">
        <div className="h-2.5 w-20 rounded-full bg-white/80" />
        <div className="mt-2 h-2.5 w-40 rounded-full bg-white/60" />
        <div className="mt-4 flex items-center gap-2">
          <div className="h-8 rounded-full bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-900 flex items-center">
            Shop now
          </div>
          <div className="h-8 w-8 rounded-full border border-white/20 bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function getBadgeLabel(badge?: SectionTypeDefinition["badge"]) {
  if (!badge) return null;
  if (badge === "popular") return "Popular";
  if (badge === "pro") return "Pro";
  return "New";
}

function SectionCard({
  section,
  disabled,
  onPick,
}: {
  section: SectionTypeDefinition;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={section.label}
      title={section.label}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "group overflow-hidden rounded-[28px] border bg-white text-left shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-200",
        disabled
          ? "cursor-not-allowed border-slate-200 opacity-55"
          : "border-slate-200 hover:-translate-y-1 hover:border-[#86a3ff] hover:shadow-[0_24px_50px_rgba(69,101,208,0.18)]",
      )}
    >
      <div className="p-4">
        <PreviewShell section={section} />
      </div>
      <div className="space-y-3 px-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950">{section.label}</h3>
              {section.badge ? (
                <Badge className="rounded-full border-0 bg-[#e8efff] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#3654b1] hover:bg-[#e8efff]">
                  {getBadgeLabel(section.badge)}
                </Badge>
              ) : null}
              {section.unique ? (
                <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Single use
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            {section.category}
          </span>
          {disabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
              <Check className="h-3.5 w-3.5" />
              Added already
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#3654b1] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors group-hover:bg-[#28449c]">
              Add section
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function SectionPicker({
  open,
  onOpenChange,
  isOpen,
  onClose,
  onAdd,
  existingSectionTypes = [],
}: SectionPickerProps) {
  const actualOpen = isOpen ?? open ?? false;
  const close = () => {
    onClose?.();
    onOpenChange?.(false);
  };
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<PickerCategory>("all");

  const isSearching = search.trim().length > 0;
  const normalizedQuery = search.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    return SECTION_TYPES.filter((section) => {
      if (
        normalizedQuery &&
        !section.label.toLowerCase().includes(normalizedQuery) &&
        !section.description.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }

      if (!isSearching && activeCategory !== "all" && section.category !== activeCategory) {
        return false;
      }

      return true;
    });
  }, [activeCategory, isSearching, normalizedQuery]);

  const groupedSections = useMemo(() => {
    return SECTION_CATEGORY_META.filter((category) => category.id !== "all")
      .map((category) => ({
        ...category,
        sections: filteredSections.filter((section) => section.category === category.id),
      }))
      .filter((group) => group.sections.length > 0);
  }, [filteredSections]);

  const counts = useMemo(() => {
    const allCount = SECTION_TYPES.length;
    return SECTION_CATEGORY_META.reduce<Record<string, number>>((acc, category) => {
      if (category.id === "all") {
        acc[category.id] = allCount;
        return acc;
      }

      acc[category.id] = SECTION_TYPES.filter((section) => section.category === category.id).length;
      return acc;
    }, {});
  }, []);

  const quickPicks = useMemo(
    () => SECTION_TYPES.filter((section) => QUICK_PICK_TYPES.includes(section.type)),
    [],
  );

  return (
    <Dialog
      open={actualOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
        else onOpenChange?.(true);
      }}
    >
      <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[1320px]">
        <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-[#f3f6fb] text-slate-950 shadow-[0_35px_90px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-200 bg-white px-8 py-7">
            <DialogHeader className="space-y-0">
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-[#3654b1]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Section Library
                  </div>
                  <DialogTitle className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                    Add a real storefront block to your page
                  </DialogTitle>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    Pick a section by how it actually feels on the page. Every card below previews the layout style so building stays visual, not technical.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  onClick={close}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search hero, product grid, gallery, FAQ..."
                  className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-slate-950 placeholder:text-slate-400 focus-visible:border-[#86a3ff] focus-visible:ring-[#86a3ff]/20"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{SECTION_TYPES.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Visible</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{filteredSections.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Quick Picks</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{quickPicks.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid h-[82vh] min-h-[760px] grid-cols-[240px_minmax(0,1fr)] overflow-hidden">
            <aside className="border-r border-slate-200 bg-white/88 px-5 py-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Browse</p>
                <div className="mt-3 space-y-2">
                  {SECTION_CATEGORY_META.map((category) => {
                    const isActive = activeCategory === category.id;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all",
                          isActive
                            ? "border-[#86a3ff] bg-[#eef3ff] text-[#2746a2] shadow-sm"
                            : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950",
                        )}
                      >
                        <span className="text-sm font-semibold">{category.label}</span>
                        <span className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                          isActive ? "bg-white text-[#3654b1]" : "bg-slate-100 text-slate-500",
                        )}>
                          {counts[category.id]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {!isSearching ? (
                <div className="mt-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fe_100%)] p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[#3654b1]">
                    <Wand2 className="h-4 w-4" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Quick Start</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Start with a hero, add a product block, then finish with trust and contact sections.
                  </p>
                  <div className="mt-4 space-y-2">
                    {quickPicks.slice(0, 4).map((section) => (
                      <div key={section.type} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                        <p className="text-sm font-semibold text-slate-950">{section.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{section.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>

            <div className="min-h-0 overflow-y-auto px-6 py-6">
              {isSearching ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Search Results</h3>
                    <p className="mt-1 text-sm text-slate-500">{filteredSections.length} sections matched your search.</p>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                    {filteredSections.map((section) => {
                      const disabled = Boolean(section.unique) && existingSectionTypes.includes(section.type);
                      return (
                        <SectionCard
                          key={section.type}
                          section={section}
                          disabled={disabled}
                          onPick={() => {
                            onAdd(section.type);
                            close();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {groupedSections.map((group) => (
                    <section key={group.id} className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">{group.label}</h3>
                          <p className="mt-1 text-sm text-slate-500">{group.sections.length} ready-to-use layouts</p>
                        </div>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                        {group.sections.map((section) => {
                          const disabled = Boolean(section.unique) && existingSectionTypes.includes(section.type);
                          return (
                            <SectionCard
                              key={section.type}
                              section={section}
                              disabled={disabled}
                              onPick={() => {
                                onAdd(section.type);
                                close();
                              }}
                            />
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-8 py-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="h-4 w-4 text-[#3654b1]" />
              <span>{filteredSections.length} visual sections ready to add</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={close}
            >
              Close library
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
