import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings, ExternalLink, Eye, Save } from "lucide-react";
import type { CanvasPage } from "@/lib/adminApi";
import { updateCanvasPage } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

interface PageMetadataFormProps {
  page: CanvasPage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageMetadataForm({ page, open, onOpenChange }: PageMetadataFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: page.title,
    slug: page.slug,
    description: page.description || "",
    seoTitle: page.seoTitle || "",
    seoDescription: page.seoDescription || "",
    seoImage: page.seoImage || "",
    showInNav: page.showInNav,
    sortOrder: page.sortOrder,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CanvasPage>) => updateCanvasPage(page.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages", page.id] });
      toast({ title: "Page updated", description: "Metadata saved successfully." });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update page metadata.", variant: "destructive" });
    },
  });

  function handleSave() {
    const slug = form.slug.startsWith("/") ? form.slug : `/${form.slug}`;
    updateMutation.mutate({
      title: form.title,
      slug,
      description: form.description || undefined,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      seoImage: form.seoImage || undefined,
      showInNav: form.showInNav,
      sortOrder: form.sortOrder,
    });
  }

  function autoSlug() {
    const slug = "/" + form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm((prev) => ({ ...prev, slug }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Page Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="About Us"
            />
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={autoSlug}>
              Auto-generate slug from title
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="/about"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this page"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>SEO Title</Label>
            <Input
              value={form.seoTitle}
              onChange={(e) => setForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
              placeholder="Custom title for search engines"
            />
          </div>

          <div className="space-y-2">
            <Label>SEO Description</Label>
            <Input
              value={form.seoDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, seoDescription: e.target.value }))}
              placeholder="Meta description for search engines"
            />
          </div>

          <div className="space-y-2">
            <Label>SEO Image URL</Label>
            <Input
              value={form.seoImage}
              onChange={(e) => setForm((prev) => ({ ...prev, seoImage: e.target.value }))}
              placeholder="/images/og-image.webp"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Show in Navigation</Label>
              <p className="text-xs text-muted-foreground">Display this page in the storefront nav.</p>
            </div>
            <Switch
              checked={form.showInNav}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, showInNav: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              className="w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
