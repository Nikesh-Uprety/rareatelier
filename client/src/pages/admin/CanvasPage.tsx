import { useState } from "react";
import { PageListSidebar } from "@/components/canvas/PageListSidebar";
import { PageEditor } from "@/components/canvas/PageEditor";
import { CreatePageDialog } from "@/components/canvas/CreatePageDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import type { CanvasPage } from "@/lib/adminApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCanvasPages, updateCanvasPage, reorderCanvasPages } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";
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

type ActiveTab = "pages" | "templates" | "theme" | "navigation";

export default function CanvasPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("pages");
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function handlePageSelect(id: number) {
    setSelectedPageId(id);
    setActiveTab("pages");
  }

  function handlePageCreated(id: number) {
    setSelectedPageId(id);
  }

  function handleDeletePage(_id: number) {
    if (selectedPageId === _id) {
      setSelectedPageId(null);
    }
  }

  function handlePreview(page: CanvasPage) {
    const slug = page.slug === "/" ? "" : page.slug;
    window.open(`/storefront${slug}`, "_blank");
  }

  const sidebarWidth = sidebarCollapsed ? "w-12" : "w-64";

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
            {/* Pages section */}
            <div className="p-3">
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "pages"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => setActiveTab("pages")}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Pages</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Build multi-page site
                  </p>
                </div>
              </button>
            </div>

            <Separator className="mx-3" />

            {/* Templates section */}
            <div className="p-3">
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "templates"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => setActiveTab("templates")}
              >
                <Palette className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Templates</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Homepage layouts
                  </p>
                </div>
              </button>
            </div>

            <Separator className="mx-3" />

            {/* Navigation section */}
            <div className="p-3">
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "navigation"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => setActiveTab("navigation")}
              >
                <LinkIcon className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Navigation</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Manage storefront nav
                  </p>
                </div>
              </button>
            </div>

            <Separator className="mx-3" />

            {/* Theme section */}
            <div className="p-3">
              <button
                type="button"
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "theme"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => setActiveTab("theme")}
              >
                <Type className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">Theme</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Fonts & branding
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Collapsed icon nav */}
        {sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center gap-4 py-4">
            <button
              type="button"
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === "pages" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setActiveTab("pages")}
              title="Pages"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === "templates" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setActiveTab("templates")}
              title="Templates"
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === "theme" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setActiveTab("theme")}
              title="Theme"
            >
              <Type className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={cn(
                "p-2 rounded-lg transition-colors",
                activeTab === "navigation" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setActiveTab("navigation")}
              title="Navigation"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Page List (when Pages tab active and no page selected) */}
      {activeTab === "pages" && !selectedPageId && (
        <div className="w-72 border-r bg-card/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-sm font-bold">Pages</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a page to edit or create a new one.
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
      )}

      {/* Page Editor (when a page is selected) */}
      {activeTab === "pages" && selectedPageId && (
        <div className="flex-1 overflow-hidden">
          <PageEditor pageId={selectedPageId} onBack={() => setSelectedPageId(null)} />
        </div>
      )}

      {/* Templates tab - placeholder */}
      {activeTab === "templates" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Palette className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-semibold">Templates</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                The existing template editor is available in the Canvas tab. Template management coming soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation tab - management */}
      {activeTab === "navigation" && <NavigationManager />}

      {/* Theme tab - placeholder */}
      {activeTab === "theme" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Type className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <div>
              <h3 className="text-lg font-semibold">Theme & Branding</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Font presets are available in the existing Canvas. Color presets and branding coming soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Page Dialog */}
      <CreatePageDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handlePageCreated}
      />
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
