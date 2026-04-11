import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PageListSidebar } from "@/components/canvas/PageListSidebar";
import { CreatePageDialog } from "@/components/canvas/CreatePageDialog";
import { PageMetadataForm } from "@/components/canvas/PageMetadataForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  FileText,
  Palette,
  Type,
  Home,
  Layout,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  GripVertical,
  Eye,
  EyeOff,
  Image,
  Upload,
  Settings,
  Plus,
  Check,
  Trash2,
  X,
  Loader2,
  Edit,
} from "lucide-react";
import {
  Label,
  Skeleton,
  OptimizedImage,
} from "@/components/ui";
import {
  getStorefrontLogoFilter,
  matchesLogoPreset,
  resolveStorefrontLogo,
  STOREFRONT_BRANDING_QUERY_KEY,
  STOREFRONT_LOGO_PRESETS,
} from "@/lib/storefrontBranding";
import { STOREFRONT_FONT_OPTIONS, STOREFRONT_FONT_FAMILIES, type StorefrontFontPreset } from "@/lib/storefrontFonts";
import type { CanvasPage, SiteBranding, ColorPreset, CanvasTemplate } from "@/lib/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCanvasPages, updateCanvasPage, reorderCanvasPages, getBranding, updateBranding, getColorPresets, createColorPreset, updateColorPreset, activateColorPreset, deleteColorPreset, uploadProductImageFile, getCanvasTemplates, generatePreviewToken } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ActiveTab = "pages" | "templates" | "theme" | "branding" | "navigation";

const CUSTOMIZATION_TABS: Array<{
  id: ActiveTab;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    id: "pages",
    label: "Pages",
    description: "Edit full-page storefront layouts",
    icon: FileText,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Start from Rare Atelier defaults",
    icon: Layout,
  },
  {
    id: "theme",
    label: "Theme",
    description: "Typography and presentation system",
    icon: Type,
  },
  {
    id: "branding",
    label: "Branding",
    description: "Logos, colors, and visual assets",
    icon: Palette,
  },
  {
    id: "navigation",
    label: "Navigation",
    description: "Header links and page ordering",
    icon: LinkIcon,
  },
];

export default function CanvasPage() {
  const [location] = useLocation();
  const { user } = useCurrentUser();
  const isSuperAdmin = user?.role?.toLowerCase() === "superadmin";
  const readTabFromUrl = (): ActiveTab => {
    if (typeof window === "undefined") return "pages";
    const params = new URLSearchParams(window.location.search);
    const value = params.get("tab");
    return CUSTOMIZATION_TABS.some((tab) => tab.id === value)
      ? (value as ActiveTab)
      : "pages";
  };
  const initialTab = useMemo<ActiveTab>(() => readTabFromUrl(), []);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCreateTemplate, setSelectedCreateTemplate] = useState<CanvasTemplate | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/admin/canvas/templates"],
    queryFn: getCanvasTemplates,
  });

  const { data: pages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ["/api/admin/canvas/pages"],
    queryFn: getCanvasPages,
  });

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );

  const canvasTabs = useMemo(
    () =>
      CUSTOMIZATION_TABS.filter((tab) => {
        if (tab.id === "branding" || tab.id === "theme") return false;
        if (!isSuperAdmin && (tab.id === "pages" || tab.id === "templates" || tab.id === "navigation")) return false;
        return true;
      }),
    [isSuperAdmin],
  );

  useEffect(() => {
    if (typeof window === "undefined" || isSuperAdmin) return;
    window.history.replaceState({}, "", "/admin/canvas/branding");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [isSuperAdmin]);

  useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      setActiveTab(readTabFromUrl());

      const nextPageId = Number(params.get("pageId"));
      if (params.get("tab") === "pages" && Number.isFinite(nextPageId) && nextPageId > 0) {
        setSelectedPageId(nextPageId);
        return;
      }

      if (params.get("panel") === "list" || params.get("tab") !== "pages") {
        setSelectedPageId(null);
      }
    };

    syncFromUrl();

    window.addEventListener("popstate", syncFromUrl);
    window.addEventListener("canvas-customization-nav", syncFromUrl);

    return () => {
      window.removeEventListener("popstate", syncFromUrl);
      window.removeEventListener("canvas-customization-nav", syncFromUrl);
    };
  }, [location]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    if (activeTab !== "pages") {
      params.delete("panel");
      params.delete("pageId");
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.dispatchEvent(new Event("canvas-customization-nav"));
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeTab === "branding") {
      window.history.replaceState({}, "", "/admin/canvas/branding");
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    if (activeTab === "theme") {
      window.history.replaceState({}, "", "/admin/canvas/theme");
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    if (!isSuperAdmin && (activeTab === "pages" || activeTab === "templates" || activeTab === "navigation")) {
      window.history.replaceState({}, "", "/admin/canvas/branding");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [activeTab, isSuperAdmin]);

  if (!isSuperAdmin) {
    return null;
  }

  function handlePageSelect(id: number) {
    setSelectedPageId(id);
    setActiveTab("pages");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", "pages");
      params.set("panel", "details");
      params.set("pageId", String(id));
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", nextUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new Event("canvas-customization-nav"));
    }
  }

  function handleOpenBuilder(id: number) {
    if (typeof window === "undefined") return;
    window.history.pushState({}, "", `/admin/canvas/builder?pageId=${id}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function handlePageCreated(id: number) {
    setSelectedPageId(id);
    setSelectedCreateTemplate(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", "pages");
      params.set("panel", "details");
      params.set("pageId", String(id));
      const nextUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", nextUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
      window.dispatchEvent(new Event("canvas-customization-nav"));
    }
  }

  function handleDeletePage(_id: number) {
    if (selectedPageId === _id) {
      setSelectedPageId(null);
    }
  }

  async function handlePreview(page: CanvasPage) {
    const slug = page.slug === "/" ? "/" : page.slug;

    if (page.status === "published") {
      window.open(slug, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const token = await generatePreviewToken(page.id);
      const previewUrl = slug === "/" ? `/?token=${token}` : `${slug}?token=${token}`;
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(slug, "_blank", "noopener,noreferrer");
    }
  }

  const sidebarWidth = sidebarCollapsed ? "w-12" : "w-64";
  const activeTabMeta = canvasTabs.find((tab) => tab.id === activeTab);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div
        className={cn(
          "border-r bg-card/50 flex flex-col transition-all duration-300 shrink-0",
          sidebarWidth
        )}
      >
        {/* Collapse toggle */}
        <div className="flex items-center justify-between p-3 border-b">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-wide">Canvas</span>
              <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground">
                BETA
              </Badge>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-auto"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Nav items */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <div className="space-y-1.5">
                {canvasTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50 text-muted-foreground"
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{tab.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {tab.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Collapsed icon nav */}
        {sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center gap-4 py-4">
            {canvasTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}
        </div>

      {activeTab === "pages" && (
        <>
          <div className="w-72 border-r bg-card/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold">Pages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a page to manage or create a new one.
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <PageListSidebar
              selectedId={selectedPageId}
              onSelect={handlePageSelect}
              onCreatePage={() => setShowCreateDialog(true)}
              onDeletePage={handleDeletePage}
              onPreview={handlePreview}
            />
          </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f8fc_0%,#eef3ff_100%)]">
            <div className="border-b border-black/10 bg-white/85 px-6 py-5 backdrop-blur-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-[#4565d0]">
                Page Studio
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Build pages from a focused canvas, not an inline preview.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Select a page, review its metadata here, then open the dedicated builder to add sections,
                preview changes, and shape the storefront live.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {pagesLoading ? (
                <div className="grid gap-4 lg:grid-cols-[1.6fr,1fr]">
                  <Skeleton className="h-[320px] w-full rounded-[32px]" />
                  <Skeleton className="h-[320px] w-full rounded-[32px]" />
                </div>
              ) : selectedPage ? (
                <div className="grid gap-6 lg:grid-cols-[1.65fr,1fr]">
                  <div className="rounded-[32px] border border-[#bfd1ff] bg-white p-8 shadow-[0_24px_60px_rgba(69,101,208,0.10)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-[#bfd1ff] bg-[#eef3ff] text-[#3654b1]">
                            {selectedPage.isHomepage ? "Homepage" : "Storefront Page"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-transparent",
                              selectedPage.status === "published"
                                ? "bg-emerald-500/10 text-emerald-700"
                                : "bg-slate-900/5 text-slate-600",
                            )}
                          >
                            {selectedPage.status === "published" ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="text-3xl font-semibold tracking-tight text-slate-950">
                            {selectedPage.title}
                          </h3>
                          <p className="mt-2 font-mono text-sm text-slate-500">{selectedPage.slug}</p>
                        </div>
                        <p className="max-w-2xl text-sm leading-7 text-slate-600">
                          {selectedPage.description ||
                            "Open this page in the builder to add sections, refine composition, and preview the storefront layout without reloading the page."}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-[#d6e0ff] bg-[#f8fbff] px-5 py-4 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Navigation
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-950">
                          {selectedPage.showInNav ? "Shown in storefront nav" : "Hidden from nav"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Sort order {selectedPage.sortOrder}</p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => handleOpenBuilder(selectedPage.id)}
                        className="rounded-[24px] border border-[#8fa8ff] bg-[#4565d0] px-5 py-5 text-left text-white shadow-[0_16px_36px_rgba(69,101,208,0.26)] transition-transform hover:-translate-y-0.5"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">Builder</p>
                        <p className="mt-3 text-xl font-semibold">Open visual builder</p>
                        <p className="mt-2 text-sm text-white/80">
                          Edit on a blank live canvas with section controls and instant rendering.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreview(selectedPage)}
                        className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 text-left transition-colors hover:border-[#bfd1ff] hover:bg-[#f8fbff]"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Preview</p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">Open storefront page</p>
                        <p className="mt-2 text-sm text-slate-600">
                          Check the public page in a separate tab without exposing the builder UI.
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMetadataForm(true)}
                        className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 text-left transition-colors hover:border-[#bfd1ff] hover:bg-[#f8fbff]"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Settings</p>
                        <p className="mt-3 text-xl font-semibold text-slate-950">Edit page metadata</p>
                        <p className="mt-2 text-sm text-slate-600">
                          Update title, slug, SEO details, and navigation visibility from one clean sheet.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-[#d6e0ff] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#4565d0]">
                        Builder Flow
                      </p>
                      <div className="mt-4 space-y-4 text-sm text-slate-600">
                        <div>
                          <p className="font-semibold text-slate-950">1. Open Builder</p>
                          <p className="mt-1">Jump into the dedicated page canvas instead of editing inside the list view.</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">2. Add Sections</p>
                          <p className="mt-1">Start from a blank white page and drop in hero, product, quote, services, and utility sections.</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">3. Refine Live</p>
                          <p className="mt-1">Click a section, adjust content, swap imagery, and watch the canvas update without a page reload.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-dashed border-[#bfd1ff] bg-[#f8fbff] p-6">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                        Current Selection
                      </p>
                      <p className="mt-3 text-lg font-semibold text-slate-950">{selectedPage.title}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedPage.seoTitle || "No custom SEO title set yet."}
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-[#bfd1ff] bg-white text-[#3654b1]">
                          {selectedPage.isHomepage ? "Pinned Home" : "Secondary Page"}
                        </Badge>
                        <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                          {selectedPage.showInNav ? "Navigation On" : "Navigation Off"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-xl rounded-[32px] border border-dashed border-[#bfd1ff] bg-white px-10 py-14 text-center shadow-[0_24px_60px_rgba(69,101,208,0.08)]">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#4565d0]">
                      Page Studio
                    </p>
                    <h3 className="mt-4 text-3xl font-semibold text-slate-950">
                      Pick a page to manage, then open the dedicated builder.
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-600">
                      The live preview no longer takes over this screen. Use this area for page selection and
                      settings, then step into the builder only when you want to design the canvas.
                    </p>
                    <Button className="mt-8" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Blank Page
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab !== "pages" ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="border-b bg-card/40 px-6 py-5">
            <h2 className="text-lg font-semibold">{activeTabMeta?.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeTabMeta?.description}</p>
          </div>

          {activeTab === "templates" ? (
            <TemplatesPanel
              templates={templates}
              isLoading={templatesLoading}
              onUseTemplate={(template) => {
                setSelectedCreateTemplate(template);
                setShowCreateDialog(true);
              }}
            />
          ) : null}

          {activeTab === "navigation" ? <NavigationManager /> : null}
        </div>
      ) : null}

      {/* Create Page Dialog */}
      <CreatePageDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) setSelectedCreateTemplate(null);
        }}
        onSuccess={handlePageCreated}
        templateId={selectedCreateTemplate?.id ?? null}
        templateName={selectedCreateTemplate?.name ?? null}
      />

      {selectedPage ? (
        <PageMetadataForm
          page={selectedPage}
          open={showMetadataForm}
          onOpenChange={setShowMetadataForm}
        />
      ) : null}
    </div>
  );
}

function TemplatesPanel({
  templates,
  isLoading,
  onUseTemplate,
}: {
  templates: CanvasTemplate[];
  isLoading: boolean;
  onUseTemplate: (template: CanvasTemplate) => void;
}) {
  const orderedTemplates = useMemo(() => {
    const featuredOrder = ["maison-nocturne", "stuffyclone", "rare-dark-luxury", "editorial-grid", "nikeshdesign"];
    return templates.slice().sort((a, b) => {
      const tierScore = a.tier === b.tier ? 0 : a.tier === "premium" ? -1 : 1;
      if (tierScore !== 0) return tierScore;
      const aIndex = featuredOrder.indexOf(a.slug);
      const bIndex = featuredOrder.indexOf(b.slug);
      const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return normalizedA - normalizedB;
    });
  }, [templates]);

  const premiumTemplates = useMemo(
    () => orderedTemplates.filter((template) => template.tier === "premium"),
    [orderedTemplates],
  );

  const freeTemplates = useMemo(
    () => orderedTemplates.filter((template) => template.tier !== "premium"),
    [orderedTemplates],
  );

  const ownedCount = useMemo(
    () => orderedTemplates.filter((template) => template.isPurchased).length,
    [orderedTemplates],
  );

  const templateSurfaceClass = (template: CanvasTemplate) => {
    if (template.slug === "stuffyclone") {
      return "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_36%),linear-gradient(135deg,#0b0b0c_0%,#17181d_58%,#0c0c0e_100%)]";
    }
    if (template.slug === "rare-dark-luxury") {
      return "bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,0.22),transparent_34%),linear-gradient(135deg,#050505_0%,#121212_40%,#1b1408_100%)]";
    }
    if (template.slug === "maison-nocturne") {
      return "bg-[radial-gradient(circle_at_top_left,rgba(201,168,76,0.18),transparent_34%),linear-gradient(135deg,#111214_0%,#19161a_40%,#0d0d0f_100%)]";
    }
    if (template.slug === "nikeshdesign") {
      return "bg-[linear-gradient(135deg,#0f1320_0%,#2f2337_46%,#161118_100%)]";
    }
    return "bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_58%,#ffffff_100%)]";
  };

  const templateAccent = (template: CanvasTemplate) => {
    if (template.tier === "premium") return "text-[#d4b460]";
    return "text-[#3654b1]";
  };

  const templateHighlights = (template: CanvasTemplate) => {
    if (template.slug === "stuffyclone") {
      return ["Side-menu navigation", "Minimal catalog grid", "Streetwear product rhythm"];
    }
    if (template.slug === "rare-dark-luxury") {
      return ["Dark-only luxury mood", "Cinematic campaign sections", "Premium long-scroll storytelling"];
    }
    if (template.slug === "maison-nocturne") {
      return ["Editorial luxury layout", "Campaign-first storytelling", "Premium conversion structure"];
    }
    if (template.slug === "nikeshdesign") {
      return ["Experimental homepage", "Magazine-like storytelling", "Fast brand iteration"];
    }
    return ["Page-builder compatible", "Ready for new pages", "Storefront-safe sections"];
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-[32px]" />
          <div className="grid gap-6 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[430px] w-full rounded-[32px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f6f8fc_0%,#eef2f8_100%)] p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 px-8 py-8 xl:grid-cols-[minmax(0,1.35fr)_340px] xl:px-10 xl:py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-[#3654b1]">
                <Layout className="h-3.5 w-3.5" />
                Template Marketplace
              </div>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                Launch new storefront pages from premium-ready layouts
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                Compare storefront directions the same way you would shop for a premium theme. Pick a layout, review its merchandising style, and spin up a new editable page in one click.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Templates</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{orderedTemplates.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Owned</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{ownedCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Premium</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{premiumTemplates.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.28)]">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">How this works</p>
              <div className="mt-5 space-y-3">
                {["Choose a template direction", "Create a new page from it", "Customize sections and publish"].map((step, index) => (
                  <div key={step} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-black text-slate-950">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{step}</p>
                      <p className="mt-1 text-xs leading-5 text-white/60">
                        {index === 0
                          ? "Review the design mood, grid style, and storefront story before committing."
                          : index === 1
                            ? "Every template becomes an editable page inside the builder, not a locked layout."
                            : "Fine-tune branding, images, and sections, then push the page live when it is ready."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {premiumTemplates.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Premium Collection</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">High-conversion storefront themes</h3>
              </div>
              <Badge className="rounded-full bg-[#111827] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-[#111827]">
                Purchase-ready presentation
              </Badge>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              {premiumTemplates.map((template) => (
                <article
                  key={template.id}
                  className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className={cn("relative h-[260px] overflow-hidden", templateSurfaceClass(template))}>
                    {template.thumbnailUrl ? (
                      <div
                        className="absolute inset-0 opacity-55 mix-blend-screen"
                        style={{
                          backgroundImage: `linear-gradient(180deg,rgba(255,255,255,0.12),rgba(0,0,0,0.0)), url(${template.thumbnailUrl})`,
                          backgroundPosition: "center",
                          backgroundSize: "cover",
                        }}
                      />
                    ) : null}
                    <div className="absolute inset-x-6 top-6 flex items-start justify-between gap-4">
                      <div>
                        <p className={cn("text-[11px] font-black uppercase tracking-[0.22em]", templateAccent(template))}>
                          {template.tier === "premium" ? "Premium Theme" : "Free Theme"}
                        </p>
                        <h4 className="mt-3 text-3xl font-semibold text-white">{template.name}</h4>
                      </div>
                      <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white hover:bg-white/10">
                        {template.isPurchased ? "Owned" : `NPR ${template.priceNpr.toLocaleString()}`}
                      </Badge>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
                      {[0, 1, 2].map((cell) => (
                        <div key={`${template.id}-${cell}`} className="h-24 rounded-[22px] border border-white/12 bg-white/10 backdrop-blur-[2px]" />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    <p className="text-sm leading-7 text-slate-600">
                      {template.description ?? "A premium storefront layout ready for merchandising, campaigns, and live publishing."}
                    </p>

                    <div className="space-y-2">
                      {templateHighlights(template).map((highlight) => (
                        <div key={highlight} className="flex items-center gap-2 text-sm text-slate-700">
                          <Check className="h-4 w-4 text-emerald-500" />
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Access</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {template.isPurchased ? "Ready to use in your studio" : "Purchase unlock available"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Price</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">
                          {template.priceNpr > 0 ? `NPR ${template.priceNpr.toLocaleString()}` : "Included"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          const fallback = template.thumbnailUrl || "/";
                          window.open(fallback, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        className="flex-1 rounded-2xl bg-[#111827] text-white hover:bg-[#0f172a]"
                        onClick={() => onUseTemplate(template)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {freeTemplates.length > 0 ? (
          <section className="space-y-5">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Included Templates</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">Fast-start layouts for drafts and experiments</h3>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              {freeTemplates.map((template) => (
                <article
                  key={template.id}
                  className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className={cn("relative min-h-[260px] p-6", templateSurfaceClass(template))}>
                      {template.thumbnailUrl ? (
                        <div
                          className="absolute inset-0 opacity-70"
                          style={{
                            backgroundImage: `linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.0)), url(${template.thumbnailUrl})`,
                            backgroundPosition: "center",
                            backgroundSize: "cover",
                          }}
                        />
                      ) : null}
                      <div className="relative z-10 max-w-xs">
                        <Badge className="rounded-full bg-white/16 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/16">
                          Free template
                        </Badge>
                        <h4 className="mt-4 text-3xl font-semibold text-white">{template.name}</h4>
                        <p className="mt-3 text-sm leading-7 text-white/72">
                          {template.description ?? "A flexible canvas template for quick storefront drafts and experiments."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-5 p-6">
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Best for</p>
                        <div className="mt-3 space-y-2">
                          {templateHighlights(template).map((highlight) => (
                            <div key={highlight} className="flex items-center gap-2 text-sm text-slate-700">
                              <Check className="h-4 w-4 text-emerald-500" />
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            const fallback = template.thumbnailUrl || "/";
                            window.open(fallback, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          className="flex-1 rounded-2xl bg-[#3654b1] text-white hover:bg-[#28449c]"
                          onClick={() => onUseTemplate(template)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function TypographyManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery({
    queryKey: ["/api/admin/canvas/branding"],
    queryFn: getBranding,
  });

  const updateBrandingMutation = useMutation({
    mutationFn: (data: Partial<SiteBranding>) => updateBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/branding"] });
      toast({ title: "Font updated", description: "Typography preset has been applied." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update font.", variant: "destructive" });
    },
  });

  const currentFont = (branding?.fontPreset || "inter") as StorefrontFontPreset;

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a font preset for your storefront.
          </p>
        </div>

        <div className="grid gap-3">
          {STOREFRONT_FONT_OPTIONS.map((option) => {
            const families = STOREFRONT_FONT_FAMILIES[option.id as StorefrontFontPreset];
            const isActive = currentFont === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => updateBrandingMutation.mutate({ fontPreset: option.id })}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border text-left transition-colors",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-muted/50 hover:border-muted/100 hover:bg-muted/30"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ fontFamily: families.preview }}>
                      {option.label}
                    </p>
                    {isActive && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                </div>
                <div className="text-2xl font-bold text-muted-foreground/20" style={{ fontFamily: families.preview }}>
                  Aa
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-3">Preview</p>
          <p className="text-xl font-semibold mb-2" style={{ fontFamily: STOREFRONT_FONT_FAMILIES[currentFont].display }}>
            The quick brown fox
          </p>
          <p className="text-sm" style={{ fontFamily: STOREFRONT_FONT_FAMILIES[currentFont].body }}>
            jumps over the lazy dog. 0123456789.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => updateBrandingMutation.mutate({ fontPreset: "inter" })}
          disabled={currentFont === "inter"}
        >
          Reset to default
        </Button>
      </div>
    </div>
  );
}

export function BrandingManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [showLogoDarkDialog, setShowLogoDarkDialog] = useState(false);
  const [showFaviconDialog, setShowFaviconDialog] = useState(false);
  const [showFooterDialog, setShowFooterDialog] = useState(false);
  const [showColorDialog, setShowColorDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ColorPreset | null>(null);

  const { data: branding, isLoading: brandingLoading } = useQuery({
    queryKey: ["/api/admin/canvas/branding"],
    queryFn: getBranding,
  });

  const { data: colorPresets, isLoading: presetsLoading } = useQuery({
    queryKey: ["/api/admin/canvas/colors"],
    queryFn: getColorPresets,
  });

  const [activePresetId, setActivePresetId] = useState<number | null>(null);

  const updateBrandingMutation = useMutation({
    mutationFn: (data: Partial<SiteBranding>) => updateBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/branding"] });
      queryClient.invalidateQueries({ queryKey: STOREFRONT_BRANDING_QUERY_KEY });
      toast({ title: "Branding saved", description: "Branding settings updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save branding.", variant: "destructive" });
    },
  });

  const createPresetMutation = useMutation({
    mutationFn: (data: Partial<ColorPreset>) => createColorPreset(data),
    onSuccess: (preset) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/colors"] });
      setActivePresetId(preset.id);
      toast({ title: "Color preset created", description: `"${preset.presetName}" has been created.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create color preset.", variant: "destructive" });
    },
  });

  const updatePresetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ColorPreset> }) => updateColorPreset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/colors"] });
      toast({ title: "Color preset updated", description: "Color preset has been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update color preset.", variant: "destructive" });
    },
  });

  const activatePresetMutation = useMutation({
    mutationFn: (id: number) => activateColorPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/colors"] });
      toast({ title: "Color preset activated", description: "Color preset is now active." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to activate color preset.", variant: "destructive" });
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: (id: number) => deleteColorPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/colors"] });
      toast({ title: "Color preset deleted", description: "Color preset has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete color preset.", variant: "destructive" });
    },
  });

  const applyLogoPreset = (presetId: string) => {
    const preset = STOREFRONT_LOGO_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    updateBrandingMutation.mutate({
      logoUrl: preset.logoUrl,
      logoDarkUrl: preset.logoDarkUrl ?? null,
    });
  };

  if (brandingLoading || presetsLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        {/* Logo & Favicon Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Image className="h-5 w-5" />
            Logo & Favicon
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your brand logo (light and dark versions) and favicon.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo Light Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Logo (Light Mode)
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoDialog(true)}
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
                {branding?.logoUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateBrandingMutation.mutate({ logoUrl: null })}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                ) : null}
              </Label>
              {branding?.logoUrl ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Current logo:</p>
                  <div className="mt-2 flex min-h-24 items-center justify-center rounded-lg border border-muted/50 bg-white p-4">
                    <OptimizedImage
                      src={resolveStorefrontLogo(branding, "light").src}
                      alt="Brand logo"
                      className="h-16 w-auto object-contain"
                      style={{ filter: getStorefrontLogoFilter({ branding, variant: "light" }) }}
                      priority
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No logo uploaded</p>
              )}
            </div>

            {/* Favicon Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Favicon
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFaviconDialog(true)}
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
                {branding?.faviconUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateBrandingMutation.mutate({ faviconUrl: null })}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                ) : null}
              </Label>
              {branding?.faviconUrl ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Current favicon:</p>
                  <OptimizedImage
                    src={branding.faviconUrl}
                    alt="Favicon"
                    className="h-8 w-8 rounded"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No favicon uploaded</p>
              )}
            </div>

            {/* Logo Dark Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                Logo (Dark Mode)
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoDarkDialog(true)}
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </Button>
                {branding?.logoDarkUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateBrandingMutation.mutate({ logoDarkUrl: null })}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                ) : null}
              </Label>
              {branding?.logoDarkUrl || branding?.logoUrl ? (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    {branding?.logoDarkUrl ? "Current dark logo:" : "Dark surface preview:"}
                  </p>
                  <div className="mt-2 flex min-h-24 items-center justify-center rounded-lg border border-white/10 bg-neutral-950 p-4">
                    <OptimizedImage
                      src={resolveStorefrontLogo(branding, "dark").src}
                      alt="Brand logo dark"
                      className="h-16 w-auto object-contain"
                      style={{ filter: getStorefrontLogoFilter({ branding, variant: "dark", glow: true }) }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No dark logo uploaded</p>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <h4 className="text-sm font-semibold">Preset Logos</h4>
              <p className="text-xs text-muted-foreground">
                Apply one of the previous storefront logos instantly, or upload a new one above.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {STOREFRONT_LOGO_PRESETS.map((preset) => {
                const isActive = matchesLogoPreset(branding, preset);
                const previewIsDarkSurface = (preset.previewBackground ?? "").toLowerCase() === "#000000";
                const presetPreviewSrc = previewIsDarkSurface
                  ? (preset.logoDarkUrl ?? preset.logoUrl)
                  : preset.logoUrl;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyLogoPreset(preset.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-muted/60 hover:border-muted hover:bg-muted/20",
                    )}
                  >
                    <div
                      className="flex min-h-[8.5rem] items-center justify-center rounded-lg border border-muted/50 p-4"
                      style={{ background: preset.previewBackground ?? "#ffffff" }}
                    >
                      <img
                        src={presetPreviewSrc}
                        alt={preset.label}
                        className={cn("h-auto w-auto max-w-full object-contain", preset.previewClassName ?? "max-h-14")}
                      />
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{preset.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                      </div>
                      {isActive ? (
                        <Badge variant="default" className="shrink-0 text-[9px] uppercase tracking-[0.18em]">
                          <Check className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Color Presets Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Schemes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create and manage color presets for your brand.
          </p>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingPreset(null);
                  setShowColorDialog(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Create New Preset
              </Button>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                {colorPresets?.length || 0} presets
              </Badge>
            </div>

            <div className="mt-4">
              {colorPresets && colorPresets.length > 0 ? (
                <div className="space-y-2">
                  {colorPresets.map((preset) => (
                    <ColorPresetItem
                      key={preset.id}
                      preset={preset}
                      isActive={activePresetId === preset.id}
                      onActivate={() => activatePresetMutation.mutate(preset.id)}
                      onEdit={() => {
                        setEditingPreset(preset);
                        setShowColorDialog(true);
                      }}
                      onDelete={() => deletePresetMutation.mutate(preset.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No color presets created yet. Create your first preset to get started.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Footer Settings
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Customize your storefront footer.
          </p>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              Footer Logo
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFooterDialog(true)}
              >
                <Upload className="h-3 w-3" />
                Upload
              </Button>
              {branding?.footerLogoUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateBrandingMutation.mutate({ footerLogoUrl: null })}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              ) : null}
            </Label>
            {branding?.footerLogoUrl ? (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Current footer logo:</p>
                <OptimizedImage
                  src={branding.footerLogoUrl}
                  alt="Footer logo"
                  className="h-12 w-auto rounded border border-muted/50"
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No footer logo uploaded</p>
            )}
          </div>

          <div className="space-y-3">
            <Label>Footer Text</Label>
            <Input
              placeholder="© 2026 Rare Atelier. All rights reserved."
              defaultValue={branding?.footerText || ""}
              onChange={(e) => {
                updateBrandingMutation.mutate({ footerText: e.target.value });
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Upload Dialogs */}
      <ImageUploadDialog
        open={showLogoDialog}
        onOpenChange={setShowLogoDialog}
        title="Upload Logo (Light Mode)"
        maxSizeMB={2}
        accept="image/png,image/jpeg,image/svg+xml"
        onSuccess={(url) => updateBrandingMutation.mutate({ logoUrl: url })}
      />
      <ImageUploadDialog
        open={showLogoDarkDialog}
        onOpenChange={setShowLogoDarkDialog}
        title="Upload Logo (Dark Mode)"
        maxSizeMB={2}
        accept="image/png,image/jpeg,image/svg+xml"
        onSuccess={(url) => updateBrandingMutation.mutate({ logoDarkUrl: url })}
      />
      <ImageUploadDialog
        open={showFaviconDialog}
        onOpenChange={setShowFaviconDialog}
        title="Upload Favicon"
        maxSizeMB={0.5}
        accept="image/png,image/x-icon,image/svg+xml"
        onSuccess={(url) => updateBrandingMutation.mutate({ faviconUrl: url })}
      />
      <ImageUploadDialog
        open={showFooterDialog}
        onOpenChange={setShowFooterDialog}
        title="Upload Footer Logo"
        maxSizeMB={2}
        accept="image/png,image/jpeg,image/svg+xml"
        onSuccess={(url) => updateBrandingMutation.mutate({ footerLogoUrl: url })}
      />

      {/* Color Preset Dialog */}
      <ColorPresetDialog
        open={showColorDialog}
        onOpenChange={(open) => {
          setShowColorDialog(open);
          if (!open) setEditingPreset(null);
        }}
        preset={editingPreset}
        onSave={(data) => {
          if (editingPreset) {
            updatePresetMutation.mutate({ id: editingPreset.id, data });
          } else {
            createPresetMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function ImageUploadDialog({ open, onOpenChange, title, maxSizeMB, accept, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  maxSizeMB: number;
  accept: string;
  onSuccess: (url: string) => void;
}) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > maxSizeMB * 1024 * 1024) {
      toast({ title: "File too large", description: `Maximum size is ${maxSizeMB}MB.`, variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadProductImageFile(file, (p) => setProgress(p));
      onSuccess(url);
      toast({ title: "Image uploaded", description: "File has been uploaded successfully." });
      setFile(null);
      setPreview(null);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="w-full"
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {file ? file.name : "Choose file"}
          </Button>
          {preview && (
            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/30">
              <img src={preview} alt="Preview" className="max-h-32 max-w-full object-contain" />
            </div>
          )}
          {file && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading... {progress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
              {uploading && (
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ColorPresetDialog({ open, onOpenChange, preset, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: ColorPreset | null;
  onSave: (data: Partial<ColorPreset>) => void;
}) {
  const [name, setName] = useState(preset?.presetName || "");
  const [bgPrimary, setBgPrimary] = useState(preset?.bgPrimary || "#ffffff");
  const [bgSecondary, setBgSecondary] = useState(preset?.bgSecondary || "#f5f5f5");
  const [textPrimary, setTextPrimary] = useState(preset?.textPrimary || "#000000");
  const [textSecondary, setTextSecondary] = useState(preset?.textSecondary || "#666666");
  const [accentColor, setAccentColor] = useState(preset?.accentColor || "#3b82f6");
  const [borderColor, setBorderColor] = useState(preset?.borderColor || "#e5e5e5");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      presetName: name,
      bgPrimary,
      bgSecondary,
      textPrimary,
      textSecondary,
      accentColor,
      borderColor,
    });
    onOpenChange(false);
  };

  function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 rounded border cursor-pointer shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          maxLength={7}
        />
        <Label className="text-xs text-muted-foreground whitespace-nowrap w-24">{label}</Label>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{preset ? "Edit" : "Create"} Color Preset</DialogTitle>
          <DialogDescription>
            {preset ? "Update the color values for this preset." : "Define a new color scheme for your brand."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Preset Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ocean Blue, Midnight..."
            />
          </div>

          <div className="space-y-3">
            <Label>Colors</Label>
            <ColorField label="Background" value={bgPrimary} onChange={setBgPrimary} />
            <ColorField label="Background 2" value={bgSecondary} onChange={setBgSecondary} />
            <ColorField label="Text" value={textPrimary} onChange={setTextPrimary} />
            <ColorField label="Text 2" value={textSecondary} onChange={setTextSecondary} />
            <ColorField label="Accent" value={accentColor} onChange={setAccentColor} />
            <ColorField label="Border" value={borderColor} onChange={setBorderColor} />
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="rounded-lg border p-4 space-y-3"
              style={{ backgroundColor: bgPrimary, borderColor }}
            >
              <div
                className="rounded p-3"
                style={{ backgroundColor: bgSecondary }}
              >
                <p style={{ color: textPrimary }} className="text-sm font-semibold">
                  Sample Heading
                </p>
                <p style={{ color: textSecondary }} className="text-xs mt-1">
                  This is how your color scheme will look.
                </p>
              </div>
              <button
                className="px-3 py-1.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: accentColor }}
              >
                Accent Button
              </button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {preset ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ColorPresetItem({ preset, isActive, onActivate, onEdit, onDelete }: { preset: ColorPreset; isActive: boolean; onActivate: () => void; onEdit: () => void; onDelete: () => void }) {
  const swatchBg = preset.accentColor || "#3b82f6";
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-muted/50 hover:border-muted/100 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium"
            style={{ backgroundColor: `${swatchBg}20`, color: swatchBg }}
          >
            Aa
          </div>
          <div>
            <p className="text-sm font-medium">{preset.presetName}</p>
            <p className="text-xs text-muted-foreground">
              bg: {preset.bgPrimary || 'var(--background)'} • text: {preset.textPrimary || 'var(--foreground)'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={isActive ? "text-[9px] px-2 py-0.5" : "text-[9px] px-1.5 py-0"}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onActivate}
          title="Activate this preset"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onEdit}
          title="Edit preset"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="h-6 w-6 p-0 ml-1"
          onClick={onDelete}
          title="Delete preset"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function NavigationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["/api/admin/canvas/pages"],
    queryFn: getCanvasPages,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CanvasPage> }) => updateCanvasPage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => reorderCanvasPages(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
      toast({ title: "Navigation reordered", description: "Nav order has been updated." });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sortedPages = [...(pages || [])].sort((a, b) => {
      if (a.isHomepage) return -1;
      if (b.isHomepage) return 1;
      return a.sortOrder - b.sortOrder;
    });

    const oldIndex = sortedPages.findIndex((p) => p.id === active.id);
    const newIndex = sortedPages.findIndex((p) => p.id === over.id);
    const newOrder = arrayMove(sortedPages, oldIndex, newIndex);
    reorderMutation.mutate(newOrder.map((p) => p.id));
  }

  function handleToggleNav(page: CanvasPage, checked: boolean) {
    updateMutation.mutate({ id: page.id, data: { showInNav: checked } });
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-1 w-24 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  const sortedPages = [...(pages || [])].sort((a, b) => {
    if (a.isHomepage) return -1;
    if (b.isHomepage) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Storefront Navigation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage which pages appear in the storefront navigation bar and their order.
          </p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedPages.map((page) => (
                <NavigationItem
                  key={page.id}
                  page={page}
                  onToggleNav={handleToggleNav}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-6 p-4 rounded-lg border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Drag pages to reorder. Toggle "Show in nav" to control visibility in the storefront header.
          </p>
        </div>
      </div>
    </div>
  );
}

function NavigationItem({ page, onToggleNav }: { page: CanvasPage; onToggleNav: (page: CanvasPage, checked: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {page.isHomepage ? (
        <Home className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{page.title}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{page.slug}</p>
      </div>

      <Badge
        variant={page.status === "published" ? "default" : "secondary"}
        className={cn(
          "text-[9px] px-1.5 py-0 h-4",
          page.status === "published" ? "bg-emerald-500/20 text-emerald-400" : ""
        )}
      >
        {page.status === "published" ? "Live" : "Draft"}
      </Badge>

      <div className="flex items-center gap-2">
        {page.showInNav ? (
          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
        )}
        <Switch
          checked={page.showInNav}
          onCheckedChange={(checked) => onToggleNav(page, checked)}
          disabled={page.isHomepage}
        />
      </div>
    </div>
  );
}
