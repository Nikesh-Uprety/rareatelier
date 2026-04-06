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
import { GripVertical, Eye, EyeOff, Copy, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasSection } from "@/lib/adminApi";

interface SortableSectionItemProps {
  section: CanvasSection;
  isSelected: boolean;
  onSelect: (id: number) => void;
  onToggleVisibility: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

function SortableSectionItem({
  section,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionTypeLabel = section.label || section.sectionType;
  const typeColors: Record<string, string> = {
    hero: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    quote: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    featured: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    campaign: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    ticker: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    arrivals: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    services: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "fresh-release": "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "back-to-top": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    faq: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  const colorClass = typeColors[section.sectionType] || "bg-muted text-muted-foreground border-border";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-all",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/50 hover:border-border hover:bg-muted/50",
        isDragging && "opacity-50 shadow-lg",
      )}
      onClick={() => onSelect(section.id)}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 -ml-1"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", colorClass)}>
            {section.sectionType.replace("-", " ")}
          </span>
          <span className="text-xs font-medium text-foreground truncate">
            {sectionTypeLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}
          className="p-1 rounded hover:bg-muted transition-colors"
          title={section.isVisible ? "Hide section" : "Show section"}
        >
          {section.isVisible ? (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Duplicate section"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
          className="p-1 rounded hover:bg-destructive/10 transition-colors"
          title="Delete section"
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    </div>
  );
}

interface SortableSectionListProps {
  sections: CanvasSection[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onReorder: (orderedIds: number[]) => void;
  onToggleVisibility: (id: number) => void;
  onDuplicate: (id: number) => void;
  onDelete: (id: number) => void;
}

export function SortableSectionList({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisibility,
  onDuplicate,
  onDelete,
}: SortableSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const newOrder = arrayMove(sections, oldIndex, newIndex);
    onReorder(newOrder.map((s) => s.id));
  }

  if (sections.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {sections.map((section) => (
            <SortableSectionItem
              key={section.id}
              section={section}
              isSelected={selectedId === section.id}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
