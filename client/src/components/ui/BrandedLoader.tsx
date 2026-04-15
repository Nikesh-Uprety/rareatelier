import { cn } from "@/lib/utils";

interface BrandedLoaderProps {
  fullScreen?: boolean;
  className?: string;
  variant?: "default" | "landing-glass";
}

const LANDING_LOADER_LOGO = "/images/updatedlogo.png";

export function BrandedLoader({
  fullScreen = false,
  className,
  variant = "default",
}: BrandedLoaderProps) {
  const isLandingGlass = fullScreen && variant === "landing-glass";
  const landingHeroStyle = {
    backgroundImage:
      "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(12,16,20,0.2) 100%), var(--landing-loader-hero, var(--landing-loader-lqip, none))",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  } as const;

  return (
    <div
      className={cn(
        fullScreen
          ? isLandingGlass
            ? "fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-transparent p-4 text-white"
            : "fixed inset-0 z-50 flex items-center justify-center bg-black p-4 text-white"
          : "flex w-full items-center justify-center py-16 p-4",
        className,
      )}
    >
      {isLandingGlass ? (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-[-4%] scale-[1.02] opacity-[0.92] blur-[7px] saturate-[0.94] brightness-[0.9]"
            style={landingHeroStyle}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,12,16,0.08)_0%,rgba(9,12,16,0.18)_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-white/[0.03] backdrop-blur-[2px]"
          />

          <div aria-hidden="true" className="absolute inset-0 z-0 px-4 py-4 sm:px-7 sm:py-6">
            <div className="flex h-full flex-col text-white">
              <div className="flex items-center justify-between">
                <div className="flex h-12 items-center gap-3 rounded-full border border-white/18 bg-white/8 px-4 shadow-[0_14px_44px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                  <span className="relative block h-[12px] w-[20px]">
                    <span className="absolute left-0 top-0 h-px w-4 bg-white/82" />
                    <span className="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-white/72" />
                    <span className="absolute left-0 bottom-0 h-px w-3 bg-white/65" />
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.34em] text-white/88">Menu</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-white/16 bg-white/8 backdrop-blur-xl">
                    <span className="block h-[15px] w-[15px] rounded-full border border-white/78" />
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-white/16 bg-white/8 backdrop-blur-xl">
                    <span className="relative block h-[14px] w-[16px] rounded-[4px] border border-white/78">
                      <span className="absolute -right-[3px] -top-[4px] h-[6px] w-[6px] rounded-full border border-white/72 bg-transparent" />
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div className="flex -translate-y-[3vh] flex-col items-center text-center">
                  <img
                    src={LANDING_LOADER_LOGO}
                    alt=""
                    className="w-[clamp(200px,19vw,300px)] object-contain opacity-95 drop-shadow-[0_24px_50px_rgba(0,0,0,0.18)] [filter:brightness(0)_invert(1)]"
                  />

                  <div className="mt-8 flex flex-col items-center gap-8 sm:gap-9">
                    {["SHOP", "GALLERY", "ATELIER", "CART", "SUPPORT"].map((item) => (
                      <span
                        key={item}
                        className="text-[clamp(1.45rem,2vw,2.1rem)] font-semibold uppercase tracking-[0.34em] text-white/92 [text-shadow:0_10px_24px_rgba(0,0,0,0.14)]"
                        style={{ fontFamily: '"Archivo Narrow", "Inter", sans-serif' }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="mt-10 flex items-center gap-4">
                    <span className="h-9 w-9 rounded-full border border-white/18 bg-white/8 backdrop-blur-xl" />
                    <span className="h-9 w-9 rounded-full border border-white/18 bg-white/8 backdrop-blur-xl" />
                    <span className="h-9 w-9 rounded-full border border-white/18 bg-white/8 backdrop-blur-xl" />
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-6 right-6 grid h-16 w-16 place-items-center rounded-full border border-white/16 bg-white/10 text-xl text-white/92 shadow-[0_18px_48px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:h-20 sm:w-20">
                ↗
              </div>
            </div>
          </div>
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
              ? "bg-white/18"
              : fullScreen
                ? "bg-white/15"
                : "bg-foreground/12",
          )}
        >
          <div
            className={cn(
              "loader-official-bar h-full w-full rounded-full",
              isLandingGlass ? "bg-white/90" : fullScreen ? "bg-white" : "bg-foreground/80",
            )}
          />
        </div>
        <div
          className={cn(
            "text-[10px] font-medium uppercase tracking-[0.28em]",
            isLandingGlass
              ? "text-white/68"
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
            ? "box-shadow: 0 0 18px rgba(255,255,255,0.18);"
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
