import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { buildStorefrontImageUrl } from "@/lib/storefrontImage";

interface ProductMediaStageProps {
  productName: string;
  priceLabel?: string;
  imageUrls: string[];
  stock: number;
  isDarkMode: boolean;
  isStuffyClone: boolean;
  mediaResetKey: string;
}

const DESKTOP_REEL_BUFFER = 2;
const DESKTOP_REEL_TOP_OFFSET = 6;
const PRODUCT_REEL_EVENT = "ra:product-reel-state";

function getWindowedIndices(length: number, center: number, buffer: number) {
  const start = Math.max(0, center - buffer);
  const end = Math.min(length - 1, center + buffer);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
}

function ProductMediaStage({
  productName,
  priceLabel,
  imageUrls,
  stock,
  isDarkMode,
  isStuffyClone,
  mediaResetKey,
}: ProductMediaStageProps) {
  const allImages = useMemo(() => (imageUrls.length ? imageUrls : [""]), [imageUrls]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [desktopScrollProgress, setDesktopScrollProgress] = useState(0);
  const [gallerySelectedImageIndex, setGallerySelectedImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [optimizedStageIndices, setOptimizedStageIndices] = useState<Set<number>>(() => new Set());

  const galleryCloseTimeoutRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const productSectionRef = useRef<HTMLElement | null>(null);
  const productStageRef = useRef<HTMLDivElement | null>(null);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);
  const galleryImageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const desktopScrollProgressRef = useRef(0);
  const desktopWheelFrameRef = useRef<number | null>(null);
  const desktopQueuedWheelDeltaRef = useRef(0);
  const desktopLastBroadcastRef = useRef({ progress: -1, active: false });

  const stageImageUrls = useMemo(
    () =>
      allImages.map((url) =>
        buildStorefrontImageUrl(url, {
          width: isMobileOrTablet ? 1280 : 1680,
          height: isMobileOrTablet ? 1600 : 2200,
          fit: "inside",
          quality: 86,
        }),
      ),
    [allImages, isMobileOrTablet],
  );

  const thumbnailUrls = useMemo(
    () =>
      allImages.map((url) =>
        buildStorefrontImageUrl(url, {
          width: 200,
          height: 240,
          fit: "cover",
          quality: 72,
        }),
      ),
    [allImages],
  );

  const modalImageUrls = useMemo(
    () =>
      allImages.map((url) =>
        buildStorefrontImageUrl(url, {
          width: 2200,
          height: 2800,
          fit: "inside",
          quality: 90,
        }),
      ),
    [allImages],
  );

  const desktopReelGap = isStuffyClone ? 3 : 3.5;
  const desktopRenderCenter = useMemo(() => Math.round(desktopScrollProgress), [desktopScrollProgress]);
  const desktopRenderableIndices = useMemo(
    () => getWindowedIndices(allImages.length, desktopRenderCenter, DESKTOP_REEL_BUFFER),
    [allImages.length, desktopRenderCenter],
  );
  const desktopStageLiftOffset =
    !isMobileOrTablet && allImages.length > 1
      ? Math.max(0, DESKTOP_REEL_TOP_OFFSET - Math.min(desktopScrollProgress, 1) * DESKTOP_REEL_TOP_OFFSET)
      : 0;
  const desktopMaxProgress = Math.max(0, allImages.length - 1);

  const getStageDisplaySrc = useCallback(
    (index: number) => {
      const optimizedSrc = stageImageUrls[index] || "";
      const originalSrc = allImages[index] || "";
      if (optimizedStageIndices.has(index)) {
        return optimizedSrc || originalSrc;
      }
      return originalSrc || optimizedSrc;
    },
    [allImages, optimizedStageIndices, stageImageUrls],
  );

  const broadcastDesktopReelState = useCallback(
    (progress: number) => {
      if (typeof window === "undefined") return;
      const maxProgress = Math.max(1, allImages.length - 1);
      const normalizedProgress = allImages.length > 1 ? Math.min(1, Math.max(0, progress / maxProgress)) : 0;
      const active = normalizedProgress > 0.01;
      const previous = desktopLastBroadcastRef.current;

      if (Math.abs(previous.progress - normalizedProgress) < 0.01 && previous.active === active) {
        return;
      }

      desktopLastBroadcastRef.current = { progress: normalizedProgress, active };
      window.dispatchEvent(
        new CustomEvent(PRODUCT_REEL_EVENT, {
          detail: {
            progress: normalizedProgress,
            active,
          },
        }),
      );
    },
    [allImages.length],
  );

  const setDesktopSequenceProgress = useCallback(
    (nextProgress: number) => {
      const clampedProgress = Math.max(0, Math.min(desktopMaxProgress, nextProgress));
      desktopScrollProgressRef.current = clampedProgress;
      setDesktopScrollProgress((current) =>
        Math.abs(current - clampedProgress) < 0.001 ? current : clampedProgress,
      );

      const nextIndex = Math.max(0, Math.min(allImages.length - 1, Math.round(clampedProgress)));
      setSelectedImageIndex((current) => (current === nextIndex ? current : nextIndex));
      broadcastDesktopReelState(clampedProgress);
    },
    [allImages.length, broadcastDesktopReelState, desktopMaxProgress],
  );

  useEffect(() => {
    if (selectedImageIndex > allImages.length - 1) {
      setSelectedImageIndex(0);
    }
  }, [allImages.length, selectedImageIndex]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const syncMobileOrTablet = () => setIsMobileOrTablet(mediaQuery.matches);
    syncMobileOrTablet();
    mediaQuery.addEventListener("change", syncMobileOrTablet);
    return () => mediaQuery.removeEventListener("change", syncMobileOrTablet);
  }, []);

  useEffect(() => {
    setSelectedImageIndex(0);
    setDesktopScrollProgress(0);
    setGallerySelectedImageIndex(0);
    setOptimizedStageIndices(new Set());
    desktopScrollProgressRef.current = 0;
    desktopQueuedWheelDeltaRef.current = 0;
    if (desktopWheelFrameRef.current !== null) {
      window.cancelAnimationFrame(desktopWheelFrameRef.current);
      desktopWheelFrameRef.current = null;
    }
    desktopLastBroadcastRef.current = { progress: -1, active: false };
  }, [mediaResetKey]);

  useEffect(() => {
    desktopScrollProgressRef.current = desktopScrollProgress;
  }, [desktopScrollProgress]);

  useEffect(() => {
    if (isMobileOrTablet || allImages.length <= 1) {
      setDesktopSequenceProgress(selectedImageIndex);
    }
  }, [allImages.length, isMobileOrTablet, selectedImageIndex, setDesktopSequenceProgress]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(PRODUCT_REEL_EVENT, {
            detail: { progress: 0, active: false },
          }),
        );
      }
    };
  }, []);

  useEffect(() => {
    if (isMobileOrTablet || isGalleryOpen || allImages.length <= 1) return;

    const applyQueuedWheel = () => {
      desktopWheelFrameRef.current = null;
      const queuedDelta = desktopQueuedWheelDeltaRef.current;
      desktopQueuedWheelDeltaRef.current = 0;

      if (!queuedDelta) return;
      setDesktopSequenceProgress(desktopScrollProgressRef.current + queuedDelta * 0.0021);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.ctrlKey) return;

      const section = productSectionRef.current;
      const stage = productStageRef.current;
      if (!section || !stage) return;

      const sectionRect = section.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const hasEnteredLockZone = stageRect.top <= 58;
      const sectionStillVisible = sectionRect.bottom > stageRect.top + 120;

      if (!hasEnteredLockZone || !sectionStillVisible) return;

      const current = desktopScrollProgressRef.current;
      const wantsForward = event.deltaY > 0;
      const atStart = current <= 0.001;
      const atEnd = current >= desktopMaxProgress - 0.001;
      const canReverseWithinSection = sectionRect.top >= -96;

      if ((wantsForward && atEnd) || (!wantsForward && atStart)) {
        return;
      }

      // Once the visitor has moved below the product section, upward scrolling
      // should return through the page before rewinding the image sequence.
      if (!wantsForward && !canReverseWithinSection) {
        return;
      }

      event.preventDefault();
      desktopQueuedWheelDeltaRef.current += event.deltaY;

      if (desktopWheelFrameRef.current === null) {
        desktopWheelFrameRef.current = window.requestAnimationFrame(applyQueuedWheel);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel);
      desktopQueuedWheelDeltaRef.current = 0;
      if (desktopWheelFrameRef.current !== null) {
        window.cancelAnimationFrame(desktopWheelFrameRef.current);
        desktopWheelFrameRef.current = null;
      }
    };
  }, [allImages.length, desktopMaxProgress, isGalleryOpen, isMobileOrTablet, setDesktopSequenceProgress]);

  useEffect(() => {
    const preloadCandidates = [selectedImageIndex, selectedImageIndex - 1, selectedImageIndex + 1]
      .filter((index) => index >= 0 && index < stageImageUrls.length);

    preloadCandidates.forEach((index) => {
      if (optimizedStageIndices.has(index)) return;
      const src = stageImageUrls[index];
      if (!src || src === allImages[index]) {
        setOptimizedStageIndices((current) => {
          if (current.has(index)) return current;
          const next = new Set(current);
          next.add(index);
          return next;
        });
        return;
      }

      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        setOptimizedStageIndices((current) => {
          if (current.has(index)) return current;
          const next = new Set(current);
          next.add(index);
          return next;
        });
      };
      image.src = src;
    });
  }, [allImages, optimizedStageIndices, selectedImageIndex, stageImageUrls]);

  useEffect(() => {
    if (!isGalleryOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehaviorY;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehaviorY;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehaviorY = "none";
    document.documentElement.style.overscrollBehaviorY = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehaviorY = previousBodyOverscroll;
      document.documentElement.style.overscrollBehaviorY = previousHtmlOverscroll;
    };
  }, [isGalleryOpen]);

  useEffect(() => {
    if (!isGalleryOpen) return;
    const raf = window.requestAnimationFrame(() => setIsGalleryVisible(true));
    return () => window.cancelAnimationFrame(raf);
  }, [isGalleryOpen]);

  useEffect(() => {
    if (isGalleryVisible || !isGalleryOpen) return;
    galleryCloseTimeoutRef.current = window.setTimeout(() => {
      setIsGalleryOpen(false);
    }, 220);
    return () => {
      if (galleryCloseTimeoutRef.current) {
        window.clearTimeout(galleryCloseTimeoutRef.current);
      }
    };
  }, [isGalleryOpen, isGalleryVisible]);

  const previewImage = useCallback(
    (index: number) => {
      if (index === selectedImageIndex || index < 0 || index >= allImages.length) return;
      if (!isMobileOrTablet && allImages.length > 1) {
        setDesktopSequenceProgress(index);
        return;
      }
      setSelectedImageIndex(index);
    },
    [allImages.length, isMobileOrTablet, selectedImageIndex, setDesktopSequenceProgress],
  );

  const goToImage = useCallback(
    (index: number) => {
      if (!allImages.length) return;
      const next = (index + allImages.length) % allImages.length;
      previewImage(next);
    },
    [allImages.length, previewImage],
  );

  const goToNextImage = useCallback(() => goToImage(selectedImageIndex + 1), [goToImage, selectedImageIndex]);
  const goToPreviousImage = useCallback(() => goToImage(selectedImageIndex - 1), [goToImage, selectedImageIndex]);

  const scrollGalleryToImage = useCallback((targetIndex: number, behavior: ScrollBehavior = "smooth") => {
    const container = galleryScrollRef.current;
    const target = galleryImageRefs.current[targetIndex];
    if (!container || !target) return;

    container.scrollTo({
      top: target.offsetTop,
      behavior,
    });
  }, []);

  const goToGalleryImage = useCallback(
    (targetIndex: number, behavior: ScrollBehavior = "smooth") => {
      if (!allImages.length) return;
      const next = (targetIndex + allImages.length) % allImages.length;
      setGallerySelectedImageIndex(next);
      scrollGalleryToImage(next, behavior);
    },
    [allImages.length, scrollGalleryToImage],
  );

  const goToNextGalleryImage = useCallback(() => {
    goToGalleryImage(gallerySelectedImageIndex + 1);
  }, [gallerySelectedImageIndex, goToGalleryImage]);

  const goToPreviousGalleryImage = useCallback(() => {
    goToGalleryImage(gallerySelectedImageIndex - 1);
  }, [gallerySelectedImageIndex, goToGalleryImage]);

  const closeGallery = useCallback(() => {
    previewImage(gallerySelectedImageIndex);
    setIsGalleryVisible(false);
  }, [gallerySelectedImageIndex, previewImage]);

  const openGallery = useCallback(
    (index?: number) => {
      const nextIndex = typeof index === "number" ? index : selectedImageIndex;
      setGallerySelectedImageIndex(nextIndex);
      setIsGalleryOpen(true);
    },
    [selectedImageIndex],
  );

  const goToImageInModal = useCallback((targetIndex: number) => {
    goToGalleryImage(targetIndex);
  }, [goToGalleryImage]);

  useEffect(() => {
    if (!isGalleryOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowRight") goToNextGalleryImage();
      if (event.key === "ArrowLeft") goToPreviousGalleryImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeGallery, goToNextGalleryImage, goToPreviousGalleryImage, isGalleryOpen]);

  useEffect(() => {
    if (!isGalleryOpen) return;
    const raf = window.requestAnimationFrame(() => {
      scrollGalleryToImage(gallerySelectedImageIndex, "auto");
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isGalleryOpen, scrollGalleryToImage]);

  useEffect(() => {
    if (!isGalleryOpen) return;

    const container = galleryScrollRef.current;
    if (!container) return;

    let frame = 0;
    const syncActiveFromScroll = () => {
      frame = 0;
      const viewportCenter = container.scrollTop + container.clientHeight * 0.45;
      let nextIndex = gallerySelectedImageIndex;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < allImages.length; index += 1) {
        const element = galleryImageRefs.current[index];
        if (!element) continue;
        const center = element.offsetTop + element.offsetHeight / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < bestDistance) {
          bestDistance = distance;
          nextIndex = index;
        }
      }

      setGallerySelectedImageIndex((current) => (current === nextIndex ? current : nextIndex));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncActiveFromScroll);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    syncActiveFromScroll();

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [allImages.length, gallerySelectedImageIndex, isGalleryOpen]);

  return (
    <>
      <section
        ref={productSectionRef}
        className={`${isStuffyClone ? "order-1 space-y-0 lg:min-w-0 lg:order-1 lg:-mt-[3.06rem] lg:py-0" : "space-y-4 lg:min-w-0 lg:py-0"}`}
      >
        <div className={`relative min-w-0 ${!isMobileOrTablet && allImages.length > 1 ? "lg:sticky lg:top-[3.06rem]" : ""}`}>
          <div
            ref={productStageRef}
            className={`relative h-[72vh] min-h-[520px] overflow-hidden sm:h-[76vh] ${
              isStuffyClone
                ? "bg-transparent lg:h-[calc(100dvh-3.06rem)] lg:min-h-[calc(100dvh-3.06rem)]"
                : "rounded-sm border border-border/60 bg-black/5 dark:border-white/10 dark:bg-black/35"
            }`}
            onClick={() => {
              if (didSwipeRef.current) {
                didSwipeRef.current = false;
                return;
              }
              openGallery(selectedImageIndex);
            }}
            onTouchStart={(event) => {
              didSwipeRef.current = false;
              if (event.touches[0]) {
                setTouchStartX(event.touches[0].clientX);
              }
            }}
            onTouchEnd={(event) => {
              if (touchStartX === null) return;
              const deltaX = event.changedTouches[0].clientX - touchStartX;
              if (Math.abs(deltaX) > 40) {
                didSwipeRef.current = true;
                if (deltaX < 0) goToNextImage();
                if (deltaX > 0) goToPreviousImage();
              }
              setTouchStartX(null);
            }}
          >
            {stock === 0 ? (
              <div className="absolute left-3 top-16 z-20 bg-black/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white lg:left-4 lg:top-20 lg:px-4 lg:py-2">
                Out of Stock
              </div>
            ) : null}

            {!isMobileOrTablet && allImages.length > 1 ? (
              <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 rounded-sm border border-white/20 bg-black/35 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                <span>
                  {String(selectedImageIndex + 1).padStart(2, "0")} / {String(allImages.length).padStart(2, "0")}
                </span>
              </div>
            ) : null}

            {isMobileOrTablet || allImages.length <= 1 ? (
              <img
                src={getStageDisplaySrc(selectedImageIndex)}
                alt={`${productName} - view ${selectedImageIndex + 1}`}
                loading={selectedImageIndex === 0 ? "eager" : "lazy"}
                decoding={selectedImageIndex === 0 ? "sync" : "async"}
                fetchPriority={selectedImageIndex === 0 ? "high" : "auto"}
                width={1600}
                height={2000}
                className={`absolute inset-0 z-20 h-full w-full select-none ${isStuffyClone ? "" : "object-top"}`}
                style={
                  isStuffyClone
                    ? {
                        objectFit: !isMobileOrTablet ? "cover" : "contain",
                        objectPosition: !isMobileOrTablet ? "50% 48%" : "50% 52%",
                      }
                    : undefined
                }
              />
            ) : (
              <div className="absolute inset-0">
                {desktopRenderableIndices.map((index) => (
                  <div
                    key={`desktop-reel-${index}`}
                    className="absolute inset-0 overflow-hidden will-change-transform"
                    style={{
                      transform: `translate3d(0, calc(${(index - desktopScrollProgress) * 100}% + ${(index - desktopScrollProgress) * desktopReelGap}px + ${desktopStageLiftOffset}px), 0)`,
                      zIndex: allImages.length - Math.abs(index - desktopRenderCenter),
                    }}
                  >
                    <img
                      src={getStageDisplaySrc(index)}
                      alt={`${productName} - view ${index + 1}`}
                      loading={index === selectedImageIndex || index === 0 ? "eager" : "lazy"}
                      decoding={index === selectedImageIndex || index === 0 ? "sync" : "async"}
                      fetchPriority={index === selectedImageIndex || index === 0 ? "high" : "auto"}
                      width={1600}
                      height={2000}
                      className={`absolute inset-0 h-full w-full select-none ${isStuffyClone ? "" : "object-top"}`}
                      style={
                        isStuffyClone
                          ? {
                              objectFit: "cover",
                              objectPosition: "50% 48%",
                            }
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {isMobileOrTablet && allImages.length > 1 ? (
            <div className="scrollbar-hide -mt-1 overflow-x-auto">
              <div className="flex min-w-max snap-x snap-mandatory gap-2 pb-1">
                {allImages.map((url, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      previewImage(i);
                    }}
                    className={`snap-start h-20 w-16 overflow-hidden rounded-sm border transition-all ${
                      selectedImageIndex === i ? "border-foreground" : "border-border opacity-80"
                    }`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img
                      src={thumbnailUrls[i] || url || ""}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={120}
                      height={150}
                      className="h-full w-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
              <p className={`mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.24em] ${isStuffyClone ? "text-neutral-500 dark:text-neutral-400" : "text-muted-foreground"}`}>
                Tap a preview or swipe the image
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {isGalleryOpen ? (
        <div
          className={`fixed inset-0 z-[220] transition-[opacity] duration-200 ${isGalleryVisible ? "opacity-100" : "opacity-0"}`}
          style={{ background: isDarkMode ? "#050505" : "#ffffff" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeGallery();
            }
          }}
        >
          <div className="fixed right-4 top-4 z-[240] sm:right-5 sm:top-5">
            <button
              type="button"
              onClick={() => closeGallery()}
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white/88 transition-all duration-200 hover:scale-[1.04] hover:bg-white dark:bg-black/58 dark:hover:bg-black/72"
              style={{
                borderColor: isDarkMode ? "rgba(255,255,255,0.16)" : "rgba(17,17,17,0.12)",
                color: isDarkMode ? "#ffffff" : "#111111",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
              }}
              aria-label="Close gallery"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {allImages.length > 1 ? (
            <div
              className="scrollbar-hide fixed left-4 top-4 bottom-4 z-[235] hidden w-[68px] overflow-y-auto lg:block"
              style={{
                overscrollBehaviorY: "contain",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <div className="flex flex-col gap-0">
                {allImages.map((url, i) => (
                  <button
                    key={`modal-rail-${i}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      goToImageInModal(i);
                    }}
                    className="aspect-[4/5] w-full overflow-hidden border bg-white transition-all dark:bg-black"
                    style={{
                      borderColor:
                        gallerySelectedImageIndex === i
                          ? isDarkMode
                            ? "rgba(255,255,255,0.84)"
                            : "rgba(17,17,17,0.82)"
                          : isDarkMode
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(17,17,17,0.08)",
                      opacity: gallerySelectedImageIndex === i ? 1 : 0.72,
                    }}
                    aria-label={`Open image ${i + 1}`}
                  >
                    <img
                      src={thumbnailUrls[i] || url || ""}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={140}
                      height={175}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[230] px-4 lg:px-5">
            <div
              className={`pointer-events-auto inline-flex items-center gap-5 rounded-full border px-4 py-2.5 shadow-sm ${allImages.length > 1 ? "lg:ml-[5.25rem]" : ""}`}
              style={{
                background: isDarkMode ? "rgba(10,10,10,0.78)" : "rgba(255,255,255,0.9)",
                borderColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(17,17,17,0.08)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              <p className="text-[15px] font-semibold tracking-tight" style={{ color: isDarkMode ? "#ffffff" : "#111111" }}>
                {productName}
              </p>
              {priceLabel ? (
                <p className="text-[14px] font-semibold tracking-tight" style={{ color: isDarkMode ? "rgba(255,255,255,0.88)" : "rgba(17,17,17,0.9)" }}>
                  {priceLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div
            ref={galleryScrollRef}
            className={`relative h-full w-full overflow-x-hidden overflow-y-auto scroll-smooth snap-y snap-proximity transition-transform duration-200 ${
              isGalleryVisible ? "scale-100" : "scale-[0.985]"
            }`}
            onClick={(event) => event.stopPropagation()}
            style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}
          >
            <div className="relative w-full">
              {allImages.map((url, index) => (
                <div
                  key={`modal-image-${index}`}
                  ref={(element) => {
                    galleryImageRefs.current[index] = element;
                  }}
                  className="relative w-full snap-start"
                >
                  <img
                    src={modalImageUrls[index] || url || ""}
                    alt={`${productName} fullscreen view ${index + 1}`}
                    loading={Math.abs(index - gallerySelectedImageIndex) <= 1 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={index === gallerySelectedImageIndex ? "high" : "auto"}
                    width={2200}
                    height={2800}
                    className="block h-auto w-full select-none"
                    style={{ imageRendering: "auto" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default memo(ProductMediaStage);
