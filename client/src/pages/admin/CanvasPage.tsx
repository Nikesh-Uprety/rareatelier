import { useState } from "react";
import { PageListSidebar } from "@/components/canvas/PageListSidebar";
import { PageEditor } from "@/components/canvas/PageEditor";
import { CreatePageDialog } from "@/components/canvas/CreatePageDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  FileText,
  Palette,
  Type,
  Home,
  Layout,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CanvasPage } from "@/lib/adminApi";

type ActiveTab = "pages" | "templates" | "theme";

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
