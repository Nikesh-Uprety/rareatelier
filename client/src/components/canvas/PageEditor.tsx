import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  Eye,
  Plus,
  Save,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SortableSectionList } from "./SortableSectionList";
import { SectionPicker } from "./SectionPicker";
import { PageMetadataForm } from "./PageMetadataForm";
import type { CanvasPage, CanvasSection } from "@/lib/adminApi";
import {
  getCanvasPage,
  getPageSections,
  addPageSection,
  reorderPageSections,
  updateCanvasPage,
  toggleCanvasPagePublish,
  deletePageSection,
  updatePageSection,
  duplicateCanvasPage,
} from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

const SECTION_DEFAULTS: Record<string, { label: string; config: Record<string, unknown> }> = {
  hero: { label: "Hero", config: { variant: "dark-cinematic" } },
  quote: { label: "Quote", config: { text: "Your quote here." } },
  featured: { label: "Featured Products", config: {} },
  campaign: { label: "Campaign Banner", config: {} },
  ticker: { label: "Ticker", config: { items: ["Announcement"] } },
  arrivals: { label: "New Arrivals", config: {} },
  services: { label: "Our Services", config: {} },
  "fresh-release": { label: "Fresh Release", config: {} },
  faq: { label: "FAQ", config: { title: "Frequently Asked Questions", items: [] } },
  testimonial: { label: "Testimonials", config: { items: [] } },
  "cta-banner": { label: "CTA Banner", config: {} },
  gallery: { label: "Gallery", config: { images: [] } },
  "text-block": { label: "Text Block", config: { content: "" } },
  video: { label: "Video", config: { url: "" } },
  countdown: { label: "Countdown", config: { targetDate: "" } },
  map: { label: "Map", config: { address: "" } },
};

interface PageEditorProps {
  pageId: number;
  onBack: () => void;
}

export function PageEditor({ pageId, onBack }: PageEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["/api/admin/canvas/pages", pageId],
    queryFn: () => getCanvasPage(pageId),
  });

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/admin/canvas/pages", pageId, "sections"],
    queryFn: () => getPageSections(pageId),
  });

  const selectedSection = sections?.find((s) => s.id === selectedSectionId) || null;

  const addSectionMutation = useMutation({
    mutationFn: (data: { sectionType: string; label?: string; config?: Record<string, unknown> }) =>
      addPageSection(pageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", pageId, "sections"] });
      toast({ title: "Section added", description: "New section has been added to the page." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add section.", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) => reorderPageSections(pageId, orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", pageId, "sections"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => toggleCanvasPagePublish(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", pageId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
    },
  });

  const duplicatePageMutation = useMutation({
    mutationFn: () => duplicateCanvasPage(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
      toast({ title: "Page duplicated", description: "A copy of the page has been created." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to duplicate page.", variant: "destructive" });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: deletePageSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", pageId, "sections"] });
      setSelectedSectionId(null);
      toast({ title: "Section deleted", description: "Section has been removed." });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      updatePageSection(id, { isVisible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", pageId, "sections"] });
    },
  });

  const duplicateSectionMutation = useMutation({
    mutationFn: (section: CanvasSection) =>
      addPageSection(pageId, {
        sectionType: section.sectionType,
        label: section.label ? `${section.label} (Copy)` : `${section.sectionType} (Copy)`,
        config: section.config as Record<string, unknown>,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", pageId, "sections"] });
      toast({ title: "Section duplicated", description: "Copy has been added." });
    },
  });

  const handleAddSection = useCallback(
    (sectionType: string) => {
      const defaults = SECTION_DEFAULTS[sectionType] || { label: sectionType, config: {} };
      addSectionMutation.mutate({ sectionType, label: defaults.label, config: defaults.config });
    },
    [addSectionMutation]
  );

  const handleReorder = useCallback(
    (orderedIds: number[]) => {
      reorderMutation.mutate(orderedIds);
    },
    [reorderMutation]
  );

  const handleToggleVisibility = useCallback(
    (id: number) => {
      const section = sections?.find((s) => s.id === id);
      if (section) {
        toggleVisibilityMutation.mutate({ id, isVisible: !section.isVisible });
      }
    },
    [sections, toggleVisibilityMutation]
  );

  const handleDuplicate = useCallback(
    (id: number) => {
      const section = sections?.find((s) => s.id === id);
      if (section) {
        duplicateSectionMutation.mutate(section);
      }
    },
    [sections, duplicateSectionMutation]
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteSectionMutation.mutate(id);
    },
    [deleteSectionMutation]
  );

  if (pageLoading || sectionsLoading) {
    return (
      <div className="flex h-full gap-6 p-6">
        <div className="w-80 space-y-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left: Section List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold truncate">{page.title}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">{page.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={page.status === "published" ? "default" : "secondary"}
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                page.status === "published" ? "bg-emerald-500/20 text-emerald-400" : ""
              )}
            >
              {page.status === "published" ? "Published" : "Draft"}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => publishMutation.mutate()}
            >
              {page.status === "published" ? "Unpublish" : "Publish"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => duplicatePageMutation.mutate()}
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Duplicate Page
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 ml-auto"
              onClick={() => setShowMetadataForm(true)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto p-3">
          {sections && sections.length > 0 ? (
            <SortableSectionList
              sections={sections}
              selectedId={selectedSectionId}
              onSelect={setSelectedSectionId}
              onReorder={handleReorder}
              onToggleVisibility={handleToggleVisibility}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">No sections yet</p>
              <Button size="sm" onClick={() => setShowSectionPicker(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Section
              </Button>
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <Button size="sm" className="w-full" onClick={() => setShowSectionPicker(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Right: Section Editor */}
      <div className="flex-1 overflow-y-auto">
        {selectedSection ? (
          <div className="p-6">
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{selectedSection.label || selectedSection.sectionType}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Type: {selectedSection.sectionType} · {selectedSection.isVisible ? "Visible" : "Hidden"}
                </p>
              </div>

              <Separator />

              {/* Section config editor - reuse existing editors based on sectionType */}
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Section configuration for <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{selectedSection.sectionType}</code>
                </p>
                <p className="text-xs text-muted-foreground">
                  Current config: <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-60">{JSON.stringify(selectedSection.config, null, 2)}</pre>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Select a section</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a section from the left panel to edit its configuration.
                </p>
              </div>
              <Button onClick={() => setShowSectionPicker(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Section
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <SectionPicker
        open={showSectionPicker}
        onOpenChange={setShowSectionPicker}
        onAdd={handleAddSection}
      />

      {page && (
        <PageMetadataForm
          page={page}
          open={showMetadataForm}
          onOpenChange={setShowMetadataForm}
        />
      )}
    </div>
  );
}
