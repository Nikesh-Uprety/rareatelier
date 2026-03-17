import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface VideoSource {
  src: string;
  type: string;
}

interface PerformanceVideoProps {
  sources: VideoSource[];
  poster: string;
  className?: string;
  onEnded?: () => void;
  autoPlay?: boolean;
}

export function PerformanceVideo({
  sources,
  poster,
  className,
  onEnded,
  autoPlay = true,
}: PerformanceVideoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
    
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      const loadTime = performance.now() - startTimeRef.current;
      console.log(`[PerformanceVideo] 4K Video ready in ${Math.round(loadTime)}ms`);
      setIsLoaded(true);
      if (autoPlay) {
        // Ensure muted is true programmatically to help with autoplay policies
        video.muted = true;
        video.play().catch((e) => {
          console.warn("[PerformanceVideo] Autoplay blocked or failed:", e);
        });
      }
    };

    const handleError = (e: any) => {
      if (video.networkState === video.NETWORK_NO_SOURCE) {
        console.error("[PerformanceVideo] Source loading error:", e);
        setError("Failed to load video");
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    if (onEnded) video.addEventListener("ended", onEnded);

    // Force load to initiate connection
    video.load();

    // Battery-Saver API check (Experimental but useful)
    const checkBattery = async () => {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        if (battery.saveData || battery.level < 0.15) {
          console.log("[PerformanceVideo] Battery saver or low battery detected. Limiting fidelity.");
          // We don't change the source here, but we could if we had distinct low-res sources
        }
      }
    };
    checkBattery();

    // Intersection Observer to manage playback for performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (isLoaded && autoPlay) video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(video);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      if (onEnded) video.removeEventListener("ended", onEnded);
      observer.unobserve(video);
    };
  }, [onEnded, autoPlay, isLoaded]);

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {/* Poster Image - Shows while loading or on error */}
      <AnimatePresence>
        {(!isLoaded || error) && poster && (
          <motion.img
            src={poster}
            alt="Video poster"
            className="absolute inset-0 w-full h-full object-cover z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          />
        )}
      </AnimatePresence>

      <video
        ref={videoRef}
        muted
        autoPlay={autoPlay}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-1000",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        {sources.map((source, index) => (
          <source key={index} src={source.src} type={source.type} />
        ))}
      </video>
    </div>
  );
}
