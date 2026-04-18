import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Link2, ArrowUpRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface GenerateCustomLinkUIProps {
  link: string;
  disabled?: boolean;
  disabledReason?: string;
  onGenerate: () => void;
}

export function GenerateCustomLinkUI({
  link,
  disabled = false,
  disabledReason,
  onGenerate,
}: GenerateCustomLinkUIProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedState, setCopiedState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    if (copiedState === "copied") {
      const timer = window.setTimeout(() => setCopiedState("idle"), 1400);
      return () => clearTimeout(timer);
    }
  }, [copiedState]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedState("copied");
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  }

  const handleGenerateClick = () => {
    onGenerate();
    setIsExpanded(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="h-11 w-full justify-center rounded-md border-black/15 bg-white px-4 text-[13px] font-medium text-[#1f1e1a] transition-colors hover:border-black/25 hover:bg-[#f6f5f1] disabled:cursor-not-allowed disabled:opacity-50 dark:border-border dark:bg-card dark:text-foreground dark:hover:border-border dark:hover:bg-muted"
        onClick={handleGenerateClick}
        title={disabled ? disabledReason : "Generate a custom link for the customer"}
      >
        <Link2 className="size-4" />
        Generate Custom Link
      </Button>

      {isExpanded && link && (
        <div className="animate-in fade-in duration-200">
          <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-[#faf9f5] px-3 py-2.5 dark:border-border dark:bg-muted">
            <div className="min-w-0 flex-1">
              <span
                className="block truncate text-[13px] font-mono text-[#1f1e1a] dark:text-foreground"
                title={link}
              >
                {formatLinkPreview(link)}
              </span>
              <span className="sr-only">{link}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-black/10 bg-white text-[#1f1e1a] transition-colors hover:bg-[#f1efe8] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted"
                title={copiedState === "copied" ? "Copied!" : "Copy link"}
                aria-label="Copy link to clipboard"
              >
                {copiedState === "copied" ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-9 items-center justify-center rounded-lg bg-black text-white transition-colors hover:bg-black/85 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                title="Open link in new tab"
                aria-label="Open link in new tab"
              >
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLinkPreview(link: string): string {
  try {
    const url = new URL(link);
    return `${url.host}/…`;
  } catch {
    if (link.length <= 32) return link;
    return `${link.slice(0, 28)}…`;
  }
}
