import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildStorefrontPresetImageUrl,
  STOREFRONT_CARD_FALLBACK_IMAGE,
  getStorefrontImagePresetOptions,
  type StorefrontImagePreset,
} from "@/lib/storefrontImage";
import { cn } from "@/lib/utils";

type HoverMode = "fade" | "slide";

type StorefrontCardImageProps = {
  primarySrc: string | null | undefined;
  secondarySrc?: string | null | undefined;
  alt: string;
  ratio: number;
  sizes: string;
  prioritize?: boolean;
  primaryPreset?: StorefrontImagePreset;
  secondaryPreset?: StorefrontImagePreset;
  hoverMode?: HoverMode;
  className?: string;
  aspectClassName?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  secondaryImageStyle?: CSSProperties;
  renderOverlay?: (state: { isHovered: boolean; hasSecondary: boolean }) => ReactNode;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function StorefrontCardImage({
  primarySrc,
  secondarySrc,
  alt,
  ratio,
  sizes,
  prioritize = false,
  primaryPreset = "productCardPrimary",
  secondaryPreset = "productCardSecondary",
  hoverMode = "fade",
  className,
  aspectClassName,
  imageClassName,
  imageStyle,
  secondaryImageStyle,
  renderOverlay,
}: StorefrontCardImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPrimaryLoaded, setIsPrimaryLoaded] = useState(false);
  const [isSecondaryLoaded, setIsSecondaryLoaded] = useState(false);
  const [primaryHasError, setPrimaryHasError] = useState(false);
  const [secondaryHasError, setSecondaryHasError] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(prioritize);
  const [shouldLoadSecondary, setShouldLoadSecondary] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const normalizedPrimarySrc = primarySrc?.trim() || "";
  const normalizedSecondarySrc = secondarySrc?.trim() || "";
  const hasSecondarySource = Boolean(
    normalizedSecondarySrc && normalizedSecondarySrc !== normalizedPrimarySrc,
  );

  const primaryImageUrl = useMemo(
    () => buildStorefrontPresetImageUrl(normalizedPrimarySrc, primaryPreset) || normalizedPrimarySrc,
    [normalizedPrimarySrc, primaryPreset],
  );
  const secondaryImageUrl = useMemo(() => {
    if (!hasSecondarySource) return "";
    return (
      buildStorefrontPresetImageUrl(normalizedSecondarySrc, secondaryPreset) ||
      normalizedSecondarySrc
    );
  }, [hasSecondarySource, normalizedSecondarySrc, secondaryPreset]);

  const primaryDimensions = useMemo(
    () => getStorefrontImagePresetOptions(primaryPreset),
    [primaryPreset],
  );
  const secondaryDimensions = useMemo(
    () => getStorefrontImagePresetOptions(secondaryPreset),
    [secondaryPreset],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncCanHover = () => setCanHover(mediaQuery.matches);
    syncCanHover();
    mediaQuery.addEventListener("change", syncCanHover);
    return () => mediaQuery.removeEventListener("change", syncCanHover);
  }, []);

  useEffect(() => {
    setIsPrimaryLoaded(false);
    setIsSecondaryLoaded(false);
    setPrimaryHasError(false);
    setSecondaryHasError(false);
    setIsHovered(false);
    setIsNearViewport(prioritize);
    setShouldLoadSecondary(false);
  }, [primaryImageUrl, prioritize, secondaryImageUrl]);

  useEffect(() => {
    if (prioritize) return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [prioritize]);

  useEffect(() => {
    if (!canHover || !hasSecondarySource || shouldLoadSecondary || !isNearViewport) {
      return;
    }

    const idleWindow = window as IdleWindow;
    if (typeof idleWindow.requestIdleCallback === "function") {
      const handle = idleWindow.requestIdleCallback(
        () => setShouldLoadSecondary(true),
        { timeout: 700 },
      );
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timeout = window.setTimeout(() => setShouldLoadSecondary(true), 180);
    return () => window.clearTimeout(timeout);
  }, [canHover, hasSecondarySource, isNearViewport, shouldLoadSecondary]);

  const resolvedPrimarySrc =
    primaryHasError ? STOREFRONT_CARD_FALLBACK_IMAGE : primaryImageUrl;
  const resolvedSecondarySrc =
    secondaryHasError ? resolvedPrimarySrc : secondaryImageUrl || resolvedPrimarySrc;

  const shouldRenderSecondary =
    canHover &&
    hasSecondarySource &&
    shouldLoadSecondary &&
    resolvedSecondarySrc !== resolvedPrimarySrc;

  const primaryStateClass =
    shouldRenderSecondary && isHovered
      ? hoverMode === "slide"
        ? "-translate-x-full opacity-100"
        : "opacity-0"
      : "translate-x-0 opacity-100";

  const secondaryStateClass =
    shouldRenderSecondary && isHovered
      ? hoverMode === "slide"
        ? "translate-x-0 opacity-100"
        : "opacity-100"
      : hoverMode === "slide"
        ? "translate-x-full opacity-100"
        : "opacity-0";

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => {
        if (canHover && hasSecondarySource) {
          setShouldLoadSecondary(true);
        }
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AspectRatio ratio={ratio} className={cn("relative overflow-hidden", aspectClassName)}>
        <Skeleton
          className={cn(
            "absolute inset-0 rounded-none transition-opacity duration-300",
            isPrimaryLoaded ? "opacity-0" : "opacity-100",
          )}
        />

        <img
          src={resolvedPrimarySrc}
          alt={alt}
          loading={prioritize ? "eager" : "lazy"}
          decoding={prioritize ? "sync" : "async"}
          fetchPriority={prioritize ? "high" : "auto"}
          width={primaryDimensions.width}
          height={primaryDimensions.height}
          sizes={sizes}
          onLoad={() => setIsPrimaryLoaded(true)}
          onError={() => {
            if (!primaryHasError) {
              setPrimaryHasError(true);
            }
          }}
          className={cn(
            "absolute inset-0 h-full w-full transition-[transform,opacity,filter] duration-500 ease-out",
            primaryStateClass,
            imageClassName,
          )}
          style={imageStyle}
        />

        {shouldRenderSecondary ? (
          <>
            {!isSecondaryLoaded ? (
              <Skeleton className="absolute inset-0 rounded-none opacity-30" />
            ) : null}
            <img
              src={resolvedSecondarySrc}
              alt={`${alt} alternate view`}
              loading="lazy"
              decoding="async"
              width={secondaryDimensions.width}
              height={secondaryDimensions.height}
              sizes={sizes}
              onLoad={() => setIsSecondaryLoaded(true)}
              onError={() => {
                if (!secondaryHasError) {
                  setSecondaryHasError(true);
                }
              }}
              className={cn(
                "absolute inset-0 h-full w-full transition-[transform,opacity,filter] duration-500 ease-out",
                secondaryStateClass,
                imageClassName,
              )}
              style={secondaryImageStyle ?? imageStyle}
            />
          </>
        ) : null}

        {renderOverlay?.({ isHovered, hasSecondary: shouldRenderSecondary })}
      </AspectRatio>
    </div>
  );
}
