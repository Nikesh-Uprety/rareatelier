import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { buildStorefrontImageUrl } from "@/lib/storefrontImage";

interface ProductMediaStageProps {
  productName: string;
  imageUrls: string[];
  stock: number;
  isDarkMode: boolean;
  isStuffyClone: boolean;
  mediaResetKey: string;
}

const DESKTOP_REEL_BUFFER = 2;

function getWindowedIndices(length: number, center: number, buffer: number) {
  const start = Math.max(0, center - buffer);
  const end = Math.min(length - 1, center + buffer);
  return Array.from({ length: end - start + 1 }, (_, offset) => start + offset);
}

function ProductMediaStage({
  productName,
  imageUrls,
  stock,
  isDarkMode,
  isStuffyClone,
  mediaResetKey,
}: ProductMediaStageProps) {
  const allImages = useMemo(() => (imageUrls.length ? imageUrls : [""]), [imageUrls]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isTinyPreviewMode, setIsTinyPreviewMode] = useState(false);
  const [isPreviewRailExpanded, setIsPreviewRailExpanded] = useState(true);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [loadedGalleryIndices, setLoadedGalleryIndices] = useState<Set<number>>(() => new Set([0, 1]));
  const [optimizedStageIndices, setOptimizedStageIndices] = useState<Set<number>>(() => new Set());

  const galleryCloseTimeoutRef = useRef<number | null>(null);
  const didSwipeRef = useRef(false);
  const productSectionRef = useRef<HTMLElement | null>(null);
  const productStageRef = useRef<HTMLDivElement | null>(null);
  const galleryScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const gallerySectionRefs = useRef<Array<HTMLElement | null>>([]);
  const desktopReelTargetProgressRef = useRef(0);
  const desktopRenderedProgressRef = useRef(0);
  const desktopWheelFrameRef = useRef<number | null>(null);
  const desktopActiveIndexRef = useRef(0);
  const desktopSlideRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
  const desktopReelScrollHeight = useMemo(() => {
    if (isMobileOrTablet || allImages.length <= 1) return undefined;
    const extraPanels = Math.max(0, allImages.length - 1);
    const totalVh = Math.min(100 + extraPanels * 22, 640);
    return `${totalVh}vh`;
  }, [allImages.length, isMobileOrTablet]);
  const desktopRenderableIndices = useMemo(
    () => getWindowedIndices(allImages.length, selectedImageIndex, DESKTOP_REEL_BUFFER),
    [allImages.length, selectedImageIndex],
  );

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

  const applyDesktopReelProgress = useCallback(
    (progress: number) => {
      desktopRenderedProgressRef.current = progress;
      for (const index of desktopRenderableIndices) {
        const slide = desktopSlideRefs.current[index];
        if (!slide) continue;
        const offset = index - progress;
        const translateValue = isStuffyClone
          ? `translate3d(0, calc(${offset * 100}% + ${offset * desktopReelGap}px), 0)`
          : `translate3d(0, ${offset * (100 + desktopReelGap)}%, 0)`;
        slide.style.transform = translateValue;
      }
    },
    [desktopRenderableIndices, desktopReelGap, isStuffyClone],
  );

  const animateDesktopReel = useCallback(() => {
    const target = desktopReelTargetProgressRef.current;
    const rendered = desktopRenderedProgressRef.current;
    const delta = target - rendered;

    if (Math.abs(delta) < 0.0008) {
      applyDesktopReelProgress(target);
      desktopWheelFrameRef.current = null;
      return;
    }

    const next = rendered + delta * 0.16;
    applyDesktopReelProgress(next);

    const nextActiveIndex = Math.max(0, Math.min(allImages.length - 1, Math.round(next)));
    if (desktopActiveIndexRef.current !== nextActiveIndex) {
      desktopActiveIndexRef.current = nextActiveIndex;
      setSelectedImageIndex(nextActiveIndex);
    }

    desktopWheelFrameRef.current = window.requestAnimationFrame(animateDesktopReel);
  }, [allImages.length, applyDesktopReelProgress]);

  useEffect(() => {
    if (selectedImageIndex > allImages.length - 1) {
      setSelectedImageIndex(0);
    }
  }, [allImages.length, selectedImageIndex]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 379px)");
    const syncPreviewRailMode = () => {
      const isTiny = mediaQuery.matches;
      setIsTinyPreviewMode(isTiny);
      setIsPreviewRailExpanded(!isTiny);
    };

    syncPreviewRailMode();
    mediaQuery.addEventListener("change", syncPreviewRailMode);
    return () => mediaQuery.removeEventListener("change", syncPreviewRailMode);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const syncMobileOrTablet = () => setIsMobileOrTablet(mediaQuery.matches);
    syncMobileOrTablet();
    mediaQuery.addEventListener("change", syncMobileOrTablet);
    return () => mediaQuery.removeEventListener("change", syncMobileOrTablet);
  }, []);

  useEffect(() => {
    setSelectedImageIndex(0);
    setLoadedGalleryIndices(new Set([0, 1]));
    setOptimizedStageIndices(new Set());
    desktopReelTargetProgressRef.current = 0;
    desktopRenderedProgressRef.current = 0;
    desktopActiveIndexRef.current = 0;
    applyDesktopReelProgress(0);
  }, [applyDesktopReelProgress, mediaResetKey]);

  useEffect(() => {
    applyDesktopReelProgress(desktopRenderedProgressRef.current);
  }, [applyDesktopReelProgress]);

  useEffect(() => {
    return () => {
      if (desktopWheelFrameRef.current !== null) {
        window.cancelAnimationFrame(desktopWheelFrameRef.current);
        desktopWheelFrameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isMobileOrTablet || isGalleryOpen || allImages.length <= 1) return;

    const syncReelToScroll = () => {
      const section = productSectionRef.current;
      if (!section) return;
      const totalScrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
      const traveled = Math.min(totalScrollable, Math.max(0, -section.getBoundingClientRect().top));
      const nextTarget = (traveled / totalScrollable) * (allImages.length - 1);
      desktopReelTargetProgressRef.current = nextTarget;

      const immediateIndex = Math.max(0, Math.min(allImages.length - 1, Math.round(nextTarget)));
      if (desktopActiveIndexRef.current !== immediateIndex) {
        desktopActiveIndexRef.current = immediateIndex;
        setSelectedImageIndex(immediateIndex);
      }

      if (desktopWheelFrameRef.current === null) {
        desktopWheelFrameRef.current = window.requestAnimationFrame(animateDesktopReel);
      }
    };

    syncReelToScroll();
    window.addEventListener("scroll", syncReelToScroll, { passive: true });
    window.addEventListener("resize", syncReelToScroll);
    return () => {
      window.removeEventListener("scroll", syncReelToScroll);
      window.removeEventListener("resize", syncReelToScroll);
    };
  }, [allImages.length, animateDesktopReel, isGalleryOpen, isMobileOrTablet]);

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

  useEffect(() => {
    if (!isGalleryOpen) return;

    const container = galleryScrollContainerRef.current;
    const sections = gallerySectionRefs.current.filter((section): section is HTMLElement => Boolean(section));
    if (!container || sections.length === 0) return;

    const activeSection = sections[selectedImageIndex];
    if (!activeSection) return;

    container.scrollTo({ top: Math.max(0, activeSection.offsetTop), behavior: "auto" });
  }, [isGalleryOpen, selectedImageIndex]);

  useEffect(() => {
    if (!isGalleryOpen) return;

    const sections = gallerySectionRefs.current.filter((section): section is HTMLElement => Boolean(section));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const nextIndex = Number((visible.target as HTMLElement).dataset.index ?? -1);
        if (nextIndex >= 0 && nextIndex !== selectedImageIndex) {
          setSelectedImageIndex(nextIndex);
        }
        if (nextIndex >= 0) {
          setLoadedGalleryIndices((current) => {
            const next = new Set(current);
            next.add(nextIndex);
            if (nextIndex > 0) next.add(nextIndex - 1);
            if (nextIndex + 1 < allImages.length) next.add(nextIndex + 1);
            return next;
          });
        }
      },
      {
        root: galleryScrollContainerRef.current,
        threshold: [0.3, 0.55, 0.75],
        rootMargin: "-8% 0px -8% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [allImages.length, isGalleryOpen, selectedImageIndex]);

  const previewImage = useCallback(
    (index: number) => {
      if (index === selectedImageIndex || index < 0 || index >= allImages.length) return;
      if (!isMobileOrTablet && allImages.length > 1) {
        desktopActiveIndexRef.current = index;
        setSelectedImageIndex(index);
        desktopReelTargetProgressRef.current = index;
        if (desktopWheelFrameRef.current === null) {
          desktopWheelFrameRef.current = window.requestAnimationFrame(animateDesktopReel);
        }
        return;
      }
      setSelectedImageIndex(index);
    },
    [allImages.length, animateDesktopReel, isMobileOrTablet, selectedImageIndex],
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

  const closeGallery = useCallback(() => setIsGalleryVisible(false), []);
  const openGallery = useCallback(
    (index?: number) => {
      if (typeof index === "number") {
        setSelectedImageIndex(index);
      }
      setLoadedGalleryIndices(new Set([selectedImageIndex, selectedImageIndex + 1].filter((value) => value < allImages.length)));
      setIsGalleryOpen(true);
    },
    [allImages.length, selectedImageIndex],
  );

  const goToImageInModal = useCallback((targetIndex: number) => {
    const next = (targetIndex + allImages.length) % allImages.length;
    const targetSection = gallerySectionRefs.current[next];
    if (!targetSection) return;
    setSelectedImageIndex(next);
    setLoadedGalleryIndices((current) => new Set([...Array.from(current), next]));

    const container = galleryScrollContainerRef.current;
    if (!container) {
      targetSection.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    container.scrollTo({ top: Math.max(0, targetSection.offsetTop), behavior: "smooth" });
  }, [allImages.length]);

  useEffect(() => {
    if (!isGalleryOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowRight") goToNextImage();
      if (event.key === "ArrowLeft") goToPreviousImage();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeGallery, goToNextImage, goToPreviousImage, isGalleryOpen]);

  return (
    <>
      <section
        ref={productSectionRef}
        className={`${isStuffyClone ? "order-1 space-y-0 lg:min-w-0 lg:order-1 lg:py-0" : "space-y-4 lg:min-w-0 lg:py-0"}`}
        style={desktopReelScrollHeight ? { minHeight: desktopReelScrollHeight } : undefined}
      >
        <div className={`relative min-w-0 ${desktopReelScrollHeight ? "lg:sticky lg:top-0" : ""}`}>
          <div
            ref={productStageRef}
            className={`relative h-[72vh] min-h-[520px] overflow-hidden sm:h-[76vh] ${
              isStuffyClone
                ? "bg-transparent lg:h-screen"
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

            {allImages.length > 1 && !isMobileOrTablet ? (
              <div
                className={`scrollbar-hide absolute left-2 top-1/2 z-40 -translate-y-1/2 overflow-y-auto rounded-md border border-white/30 bg-black/20 backdrop-blur-sm transition-all duration-200 sm:left-3 ${
                  isTinyPreviewMode && !isPreviewRailExpanded
                    ? "max-h-[36%] w-[26px] p-1"
                    : "flex max-h-[72%] w-[54px] flex-col gap-1.5 p-1.5 sm:w-[70px] sm:gap-2 sm:p-2"
                }`}
                onClick={(event) => event.stopPropagation()}
              >
                {isTinyPreviewMode && !isPreviewRailExpanded ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsPreviewRailExpanded(true);
                    }}
                    className="flex h-9 w-full items-center justify-center rounded-sm border border-white/40 bg-black/45 text-[10px] font-black text-white"
                    aria-label="Expand image preview rail"
                  >
                    ••
                  </button>
                ) : (
                  <>
                    {isTinyPreviewMode ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsPreviewRailExpanded(false);
                        }}
                        className="mb-1 flex h-6 w-full items-center justify-center rounded-sm border border-white/35 bg-black/45 text-[10px] font-black text-white/90"
                        aria-label="Collapse image preview rail"
                      >
                        −
                      </button>
                    ) : null}
                    {allImages.map((url, i) => (
                      <button
                        key={`desktop-thumb-${i}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          previewImage(i);
                        }}
                        className={`aspect-[4/5] w-full shrink-0 overflow-hidden rounded-sm border transition-all ${
                          selectedImageIndex === i ? "border-white opacity-100" : "border-white/30 opacity-70 hover:opacity-100"
                        }`}
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
                  </>
                )}
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
                        objectPosition: !isMobileOrTablet ? "50% 46%" : "50% 50%",
                        transform: !isMobileOrTablet ? "scale(1.08)" : undefined,
                        transformOrigin: "center center",
                      }
                    : undefined
                }
              />
            ) : (
              <div className="absolute inset-0">
                {desktopRenderableIndices.map((index) => (
                  <div
                    key={`desktop-reel-${index}`}
                    ref={(element) => {
                      desktopSlideRefs.current[index] = element;
                    }}
                    className="absolute inset-0 overflow-hidden will-change-transform"
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
                              objectPosition: "50% 46%",
                              transform: "scale(1.08)",
                              transformOrigin: "center center",
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
          className={`fixed inset-0 z-[80] transition-[opacity] duration-200 ${isGalleryVisible ? "opacity-100" : "opacity-0"}`}
          style={{ background: isDarkMode ? "#050505" : "#ffffff" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeGallery();
            }
          }}
        >
          <div
            className={`relative flex h-full w-full items-stretch justify-center transition-transform duration-200 ${
              isGalleryVisible ? "scale-100" : "scale-[0.985]"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none fixed left-4 top-4 z-[120] sm:left-5 sm:top-5">
              <div
                className="pointer-events-none inline-flex min-w-[68px] items-center justify-center rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm"
                style={{
                  borderColor: isDarkMode ? "rgba(255,255,255,0.18)" : "rgba(17,17,17,0.22)",
                  background: "transparent",
                  color: isDarkMode ? "rgba(255,255,255,0.78)" : "rgba(17,17,17,0.8)",
                }}
              >
                {String(selectedImageIndex + 1).padStart(2, "0")} / {String(allImages.length).padStart(2, "0")}
              </div>
            </div>

            <div className="pointer-events-none fixed inset-x-0 z-[120]" style={{ top: "calc(max(env(safe-area-inset-top), 0px) + 3.9rem)" }}>
              <div className="mx-auto flex w-full max-w-[1440px] justify-center px-4 sm:px-5 lg:px-8">
                <button
                  type="button"
                  onClick={() => closeGallery()}
                  className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border bg-transparent transition-all duration-200 hover:scale-[1.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  style={{
                    borderColor: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(17,17,17,0.32)",
                    color: isDarkMode ? "#ffffff" : "#111111",
                    backdropFilter: "none",
                  }}
                  aria-label="Close gallery"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex h-full w-full items-stretch gap-4 px-2 pt-0 pb-4 sm:px-4 lg:gap-6 lg:px-6">
              {allImages.length > 1 ? (
                <div
                  className="hidden w-[92px] shrink-0 overflow-y-auto rounded-2xl border p-2 backdrop-blur lg:block"
                  style={{
                    borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "rgba(17,17,17,0.10)",
                    background: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(17,17,17,0.03)",
                  }}
                >
                  <div className="flex flex-col gap-2">
                    {allImages.map((url, i) => (
                      <button
                        key={`modal-rail-${i}`}
                        type="button"
                        onClick={() => goToImageInModal(i)}
                        className="aspect-[4/5] w-full overflow-hidden rounded-sm border transition-all"
                        style={{
                          borderColor:
                            selectedImageIndex === i
                              ? isDarkMode
                                ? "rgba(255,255,255,0.70)"
                                : "rgba(17,17,17,0.60)"
                              : isDarkMode
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(17,17,17,0.12)",
                          opacity: selectedImageIndex === i ? 1 : 0.72,
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

              <div ref={galleryScrollContainerRef} className="scrollbar-hide min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex w-full max-w-[min(99vw,1880px)] flex-col">
                  {allImages.map((url, index) => {
                    const shouldRenderImage = loadedGalleryIndices.has(index) || Math.abs(index - selectedImageIndex) <= 1;
                    return (
                      <section
                        key={`gallery-section-${index}`}
                        ref={(element) => {
                          gallerySectionRefs.current[index] = element;
                        }}
                        data-index={index}
                        className="relative min-h-screen px-0 pb-5 sm:pb-6 lg:pb-8"
                      >
                        <div className="flex min-h-[calc(100vh-5.5rem)] items-start justify-center px-0">
                          {shouldRenderImage ? (
                            <img
                              src={modalImageUrls[index] || url || ""}
                              alt={`${productName} fullscreen view ${index + 1}`}
                              loading={index === selectedImageIndex ? "eager" : "lazy"}
                              decoding="async"
                              fetchPriority={index === selectedImageIndex ? "high" : "auto"}
                              width={2200}
                              height={2800}
                              className="h-auto w-full max-w-none object-contain"
                              style={{ imageRendering: "auto" }}
                            />
                          ) : (
                            <div className="w-full" style={{ aspectRatio: "4 / 5", background: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(17,17,17,0.04)" }} />
                          )}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default memo(ProductMediaStage);
