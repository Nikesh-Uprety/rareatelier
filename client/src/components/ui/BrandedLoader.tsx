import { cn } from "@/lib/utils";

interface BrandedLoaderProps {
  fullScreen?: boolean;
  className?: string;
}

export function BrandedLoader({ fullScreen = false, className }: BrandedLoaderProps) {
  return (
    <div
      className={cn(
        fullScreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black p-4 text-white"
          : "flex w-full items-center justify-center py-16 p-4",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.42em] md:text-base"
          style={{ fontFamily: '"Archivo Narrow", "Inter", sans-serif' }}
          aria-hidden="true"
        >
          RARE ATELIER
        </div>
        <div className={cn("h-[2px] w-40 overflow-hidden rounded-full md:w-48", fullScreen ? "bg-white/15" : "bg-foreground/12")}>
          <div className={cn("loader-official-bar h-full w-full rounded-full", fullScreen ? "bg-white" : "bg-foreground/80")} />
        </div>
        <div
          className={cn("text-[10px] font-medium uppercase tracking-[0.28em]", fullScreen ? "text-white/65" : "text-muted-foreground")}
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          Loading
        </div>
      </div>
      <style>{`
        .loader-official-bar {
          transform-origin: left center;
          animation: loader-official-progress 1.05s ease-in-out infinite;
          ${fullScreen ? "box-shadow: 0 0 18px rgba(255,255,255,0.2);" : ""}
        }

        @keyframes loader-official-progress {
          0% {
            transform: scaleX(0.18);
            opacity: 0.45;
          }
          50% {
            transform: scaleX(0.78);
            opacity: 1;
          }
          100% {
            transform: scaleX(0.28);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
