import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Home, FileText, MoreVertical, Trash2, Copy, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CanvasPage } from "@/lib/adminApi";
import { getCanvasPages, deleteCanvasPage, toggleCanvasPagePublish, duplicateCanvasPage } from "@/lib/adminApi";
import { useToast } from "@/hooks/use-toast";

interface PageListSidebarProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreatePage: () => void;
  onDeletePage?: (id: number) => void;
  onPreview?: (page: CanvasPage) => void;
}

export function PageListSidebar({
  selectedId,
  onSelect,
  onCreatePage,
  onDeletePage,
  onPreview,
}: PageListSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages, isLoading } = useQuery({
    queryKey: ["/api/admin/canvas/pages"],
    queryFn: getCanvasPages,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCanvasPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
      toast({ title: "Page deleted", description: "Page has been removed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to delete page.", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: toggleCanvasPagePublish,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: duplicateCanvasPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/canvas/pages"] });
      toast({ title: "Page duplicated", description: "A copy of the page has been created." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to duplicate page.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const sortedPages = [...(pages || [])].sort((a, b) => {
    if (a.isHomepage) return -1;
    if (b.isHomepage) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button
          size="sm"
          className="w-full text-xs"
          onClick={onCreatePage}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Page
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedPages.map((page) => (
          <div
            key={page.id}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all",
              selectedId === page.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "hover:bg-muted/50 border border-transparent"
            )}
            onClick={() => onSelect(page.id)}
          >
            {page.isHomepage ? (
              <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{page.title}</p>
              <p className="text-[10px] text-muted-foreground font-mono truncate">{page.slug}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Badge
                variant={page.status === "published" ? "default" : "secondary"}
                className={cn(
                  "text-[9px] px-1.5 py-0 h-4",
                  page.status === "published" ? "bg-emerald-500/20 text-emerald-400" : ""
                )}
              >
                {page.status === "published" ? "Live" : "Draft"}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => publishMutation.mutate(page.id)}>
                    {page.status === "published" ? "Unpublish" : "Publish"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateMutation.mutate(page.id)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Duplicate
                  </DropdownMenuItem>
                  {onPreview && (
                    <DropdownMenuItem onClick={() => onPreview(page)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Preview
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    disabled={page.isHomepage}
                    onClick={() => {
                      if (page.isHomepage) {
                        toast({ title: "Cannot delete", description: "Home page cannot be deleted.", variant: "destructive" });
                        return;
                      }
                      deleteMutation.mutate(page.id);
                      onDeletePage?.(page.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {page.isHomepage ? "Cannot delete" : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
