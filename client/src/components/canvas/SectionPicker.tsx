import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Layout,
  Type,
  Star,
  Megaphone,
  ArrowRight,
  ShoppingBag,
  Wrench,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Image,
  Timer,
  MapPin,
  Video,
} from "lucide-react";

const SECTION_TYPES = [
  {
    type: "hero",
    label: "Hero",
    description: "Full-width hero with slides, CTAs, and overlays.",
    icon: Layout,
  },
  {
    type: "quote",
    label: "Quote",
    description: "Brand statement or testimonial quote block.",
    icon: Type,
  },
  {
    type: "featured",
    label: "Featured Products",
    description: "Curated product carousel with cards.",
    icon: Star,
  },
  {
    type: "campaign",
    label: "Campaign Banner",
    description: "Editorial campaign or lookbook section.",
    icon: Megaphone,
  },
  {
    type: "ticker",
    label: "Gold Ticker",
    description: "Scrolling announcement or news ticker.",
    icon: ArrowRight,
  },
  {
    type: "arrivals",
    label: "New Arrivals",
    description: "Grid of latest products with cards.",
    icon: ShoppingBag,
  },
  {
    type: "services",
    label: "Our Services",
    description: "Service highlights with icons and descriptions.",
    icon: Wrench,
  },
  {
    type: "fresh-release",
    label: "Fresh Release",
    description: "New drop announcement with image and CTA.",
    icon: Sparkles,
  },
  {
    type: "testimonial",
    label: "Testimonials",
    description: "Customer reviews with star ratings.",
    icon: MessageSquare,
    comingSoon: true,
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Accordion-style Q&A section.",
    icon: HelpCircle,
  },
  {
    type: "cta-banner",
    label: "CTA Banner",
    description: "Full-width call-to-action with background.",
    icon: Megaphone,
    comingSoon: true,
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "Image grid or masonry layout.",
    icon: Image,
    comingSoon: true,
  },
  {
    type: "text-block",
    label: "Text Block",
    description: "Rich text / WYSIWYG content section.",
    icon: Type,
    comingSoon: true,
  },
  {
    type: "video",
    label: "Video",
    description: "Embedded video (YouTube, Vimeo, self-hosted).",
    icon: Video,
    comingSoon: true,
  },
  {
    type: "countdown",
    label: "Countdown",
    description: "Timer/launch countdown with target date.",
    icon: Timer,
    comingSoon: true,
  },
  {
    type: "map",
    label: "Map",
    description: "Location/map embed with address.",
    icon: MapPin,
    comingSoon: true,
  },
];

interface SectionPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (sectionType: string) => void;
}

export function SectionPicker({ open, onOpenChange, onAdd }: SectionPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = SECTION_TYPES.filter(
    (s) =>
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Section</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  disabled={item.comingSoon}
                  onClick={() => {
                    onAdd(item.type);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border text-left transition-all",
                    item.comingSoon
                      ? "border-border/30 bg-muted/30 cursor-not-allowed opacity-50"
                      : "border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg shrink-0",
                      item.comingSoon ? "bg-muted" : "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.label}</span>
                      {item.comingSoon && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
