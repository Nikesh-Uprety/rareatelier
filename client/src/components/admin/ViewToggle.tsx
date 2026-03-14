import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  className?: string;
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
  return (
    <div className={cn("flex items-center bg-muted/30 p-1 rounded-lg border border-border", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-md transition-all",
          view === "grid" ? "bg-white dark:bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onViewChange("grid")}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-md transition-all",
          view === "list" ? "bg-white dark:bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onViewChange("list")}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
