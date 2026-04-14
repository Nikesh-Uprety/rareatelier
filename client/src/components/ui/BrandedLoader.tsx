import { cn } from "@/lib/utils";

interface BrandedLoaderProps {
  fullScreen?: boolean;
  className?: string;
  variant?: "default" | "landing-glass";
}

export function BrandedLoader({
  fullScreen = false,
  className,
  variant = "default",
}: BrandedLoaderProps) {
  const isLandingGlass = fullScreen && variant === "landing-glass";

  return (
    <div
      className={cn(
        fullScreen
          ? isLandingGlass
            ? "fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#f3efe8] p-4 text-[#101318]"
            : "fixed inset-0 z-50 flex items-center justify-center bg-black p-4 text-white"
          : "flex w-full items-center justify-center py-16 p-4",
        className,
      )}
    >
      {isLandingGlass ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-[-8%] scale-110 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.08)_52%,rgba(255,255,255,0.34)_52%,rgba(255,255,255,0.48)_100%),url('/images/stussy.webp')] bg-cover bg-center opacity-90 blur-2xl saturate-[0.75]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.7),rgba(255,255,255,0.18)_48%,rgba(255,255,255,0.06)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-white/18 backdrop-blur-[18px]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24)_0%,rgba(255,255,255,0.1)_100%)]"
          />
        </>
      ) : null}

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <div
          className="whitespace-nowrap text-sm font-semibold uppercase tracking-[0.42em] md:text-base"
          style={{ fontFamily: '"Archivo Narrow", "Inter", sans-serif' }}
          aria-hidden="true"
        >
          RARE ATELIER
        </div>
        <div
          className={cn(
            "h-[2px] w-40 overflow-hidden rounded-full md:w-48",
            isLandingGlass
              ? "bg-[#101318]/12"
              : fullScreen
                ? "bg-white/15"
                : "bg-foreground/12",
          )}
        >
          <div
            className={cn(
              "loader-official-bar h-full w-full rounded-full",
              isLandingGlass ? "bg-[#101318]/85" : fullScreen ? "bg-white" : "bg-foreground/80",
            )}
          />
        </div>
        <div
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.28em]",
            isLandingGlass
              ? "text-[#101318]/55"
              : fullScreen
                ? "text-white/65"
                : "text-muted-foreground",
          )}
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          Loading
        </div>
      </div>
      <style>{`
        .loader-official-bar {
          transform-origin: left center;
          animation: loader-official-progress 1.05s ease-in-out infinite;
          ${isLandingGlass
            ? "box-shadow: 0 0 18px rgba(16,19,24,0.12);"
            : fullScreen
              ? "box-shadow: 0 0 18px rgba(255,255,255,0.2);"
              : ""}
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
