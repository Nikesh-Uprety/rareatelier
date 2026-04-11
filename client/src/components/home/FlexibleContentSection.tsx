import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, MapPin, PlayCircle, Quote, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme";

type FlexibleSectionType =
  | "testimonial"
  | "gallery"
  | "video"
  | "countdown"
  | "map"
  | "text-block";

interface FlexibleContentSectionProps {
  type: FlexibleSectionType;
  config?: Record<string, any>;
}

const FALLBACK_GALLERY_IMAGES = [
  "/images/landingpage3.webp",
  "/images/landingpage4.webp",
  "/images/home-campaign-editorial.webp",
  "/images/feature1.webp",
  "/images/feature2.webp",
  "/images/feature3.webp",
];

const DEFAULT_TESTIMONIALS = [
  {
    quote: "The quality feels deliberate. It looks sharp in person and holds up after repeated wear.",
    author: "Studio Client",
    role: "Private Capsule Buyer",
  },
  {
    quote: "Rare Atelier has the cleanest presentation and fit balance I’ve found locally.",
    author: "Editorial Customer",
    role: "Kathmandu",
  },
  {
    quote: "The buying experience feels premium, from the page flow to the final product delivery.",
    author: "Returning Customer",
    role: "Online Storefront",
  },
];

function normalizeGalleryImages(config?: Record<string, any>) {
  const raw = Array.isArray(config?.images) ? config.images : [];
  const images = raw
    .map((item: unknown) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const entry = item as Record<string, unknown>;
        if (typeof entry.image === "string") return entry.image;
        if (typeof entry.src === "string") return entry.src;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return images.length > 0 ? images.slice(0, 6) : FALLBACK_GALLERY_IMAGES;
}

function normalizeTestimonials(config?: Record<string, any>) {
  const raw = Array.isArray(config?.items) ? config.items : [];
  const items = raw
    .map((item: unknown) => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const quote = typeof entry.quote === "string"
        ? entry.quote
        : typeof entry.content === "string"
          ? entry.content
          : "";
      const author = typeof entry.author === "string"
        ? entry.author
        : typeof entry.title === "string"
          ? entry.title
          : "";
      const role = typeof entry.role === "string" ? entry.role : "";
      if (!quote.trim() || !author.trim()) return null;
      return { quote: quote.trim(), author: author.trim(), role: role.trim() };
    })
    .filter((value): value is { quote: string; author: string; role: string } => Boolean(value));

  return items.length > 0 ? items.slice(0, 6) : DEFAULT_TESTIMONIALS;
}

function normalizeVideoUrl(url?: string) {
  if (!url || !url.trim()) return "";
  const value = url.trim();
  if (value.includes("youtube.com/watch?v=")) {
    const id = new URL(value).searchParams.get("v");
    return id ? `https://www.youtube.com/embed/${id}` : value;
  }
  if (value.includes("youtu.be/")) {
    const id = value.split("youtu.be/")[1]?.split(/[?&]/)[0];
    return id ? `https://www.youtube.com/embed/${id}` : value;
  }
  if (value.includes("vimeo.com/") && !value.includes("/video/")) {
    const id = value.split("vimeo.com/")[1]?.split(/[?&]/)[0];
    return id ? `https://player.vimeo.com/video/${id}` : value;
  }
  return value;
}

function useCountdown(targetDate: string) {
  const parsedTarget = useMemo(() => {
    const next = new Date(targetDate);
    return Number.isNaN(next.getTime()) ? null : next;
  }, [targetDate]);

  const [remaining, setRemaining] = useState(() => {
    if (!parsedTarget) return 0;
    return Math.max(parsedTarget.getTime() - Date.now(), 0);
  });

  useEffect(() => {
    if (!parsedTarget) {
      setRemaining(0);
      return;
    }

    const update = () => {
      setRemaining(Math.max(parsedTarget.getTime() - Date.now(), 0));
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [parsedTarget]);

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Minutes", value: String(minutes).padStart(2, "0") },
    { label: "Seconds", value: String(seconds).padStart(2, "0") },
  ];
}

export default function FlexibleContentSection({
  type,
  config,
}: FlexibleContentSectionProps) {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === "dark";
  const variant = typeof config?.variant === "string" ? config.variant : "";

  const eyebrow = typeof config?.eyebrow === "string" && config.eyebrow.trim()
    ? config.eyebrow.trim()
    : "Rare Atelier";
  const title = typeof config?.title === "string" && config.title.trim()
    ? config.title.trim()
    : type === "gallery"
      ? "Visual World"
      : type === "video"
        ? "Campaign Motion"
        : type === "countdown"
          ? "Next Release"
          : type === "map"
            ? "Visit the Atelier"
            : type === "testimonial"
              ? "What Customers Notice"
              : "Editorial Notes";
  const text = typeof config?.text === "string" && config.text.trim()
    ? config.text.trim()
    : type === "text-block"
      ? "Use this section for campaign copy, studio notes, launch details, or a focused brand statement that breaks up the merchandising flow."
      : type === "map"
        ? "Book a visit, pick up in person, or use the showroom as a campaign touchpoint."
        : "Designed to slot into a modern premium storefront without adding visual clutter.";
  const ctaLabel = typeof config?.ctaLabel === "string" && config.ctaLabel.trim()
    ? config.ctaLabel.trim()
    : type === "map"
      ? "Open Directions"
      : "Explore More";
  const ctaHref = typeof config?.ctaHref === "string" && config.ctaHref.trim()
    ? config.ctaHref.trim()
    : type === "map"
      ? "https://maps.google.com/?q=Khusibu,Nayabazar,Kathmandu,Nepal"
      : "/products";

  if (type === "testimonial") {
    const items = normalizeTestimonials(config);
    return (
      <section className="border-y border-white/10 bg-[#0b0b0d] px-6 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1380px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{eyebrow}</p>
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2
                className="text-balance"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 5vw, 68px)", lineHeight: 0.95 }}
              >
                {title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/66">{text}</p>
            </div>
            <div className="flex items-center gap-1 text-[#c9a84c]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-4 w-4 fill-current" />
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.slice(0, 3).map((item) => (
              <article
                key={`${item.author}-${item.quote}`}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
              >
                <Quote className="h-7 w-7 text-[#c9a84c]" />
                <p className="mt-5 text-sm leading-7 text-white/78">{item.quote}</p>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-sm font-semibold">{item.author}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/45">{item.role || "Rare Atelier"}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === "gallery") {
    const images = normalizeGalleryImages(config);
    return (
      <section className="bg-black px-4 py-18 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1520px]">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{eyebrow}</p>
              <h2
                className="mt-4 text-balance text-white"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 5vw, 68px)", lineHeight: 0.94 }}
              >
                {title}
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/60">{text}</p>
          </div>

          <div className={variant === "gallery-collage" ? "grid gap-2 md:grid-cols-12 md:auto-rows-[220px]" : "grid gap-3 md:grid-cols-12 md:auto-rows-[220px]"}>
            {images.slice(0, 6).map((image, index) => {
              const spanClass = variant === "gallery-collage"
                ? index === 0
                  ? "md:col-span-5 md:row-span-2"
                  : index === 1
                    ? "md:col-span-3"
                    : index === 2
                      ? "md:col-span-4"
                      : index === 3
                        ? "md:col-span-4"
                        : index === 4
                          ? "md:col-span-4"
                          : "md:col-span-4"
                : index === 0
                  ? "md:col-span-7 md:row-span-2"
                  : index === 1
                    ? "md:col-span-5"
                    : index === 2
                      ? "md:col-span-5"
                      : index === 3
                        ? "md:col-span-4"
                        : index === 4
                          ? "md:col-span-4"
                          : "md:col-span-4";

              return (
                <div
                  key={`${image}-${index}`}
                  className={`group relative overflow-hidden rounded-[28px] bg-neutral-900 ${spanClass}`}
                >
                  <img
                    src={image}
                    alt={`${title} ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  if (type === "video") {
    const videoUrl = normalizeVideoUrl(typeof config?.url === "string" ? config.url : "");
    const poster = typeof config?.posterImage === "string" && config.posterImage.trim()
      ? config.posterImage.trim()
      : FALLBACK_GALLERY_IMAGES[2];
    const embedMode = videoUrl.includes("youtube.com/embed") || videoUrl.includes("player.vimeo.com/video");

    return (
      <section className="bg-[#0b0c10] px-6 py-20 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="max-w-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{eyebrow}</p>
            <h2
              className="mt-4 text-balance"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 5vw, 64px)", lineHeight: 0.96 }}
            >
              {title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/68">{text}</p>
            <Button
              asChild
              className="mt-8 h-12 rounded-full bg-white px-7 text-[11px] uppercase tracking-[0.22em] text-black hover:bg-white/92"
            >
              <a href={ctaHref} target={ctaHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
            <div className="aspect-[16/10] w-full">
              {videoUrl ? (
                embedMode ? (
                  <iframe
                    src={videoUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : (
                  <video className="h-full w-full object-cover" controls poster={poster}>
                    <source src={videoUrl} />
                  </video>
                )
              ) : (
                <div className="relative flex h-full items-center justify-center">
                  <img src={poster} alt={title} className="absolute inset-0 h-full w-full object-cover opacity-75" />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm">
                    <PlayCircle className="h-12 w-12 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (type === "countdown") {
    const countdownItems = useCountdown(typeof config?.targetDate === "string" ? config.targetDate : "");
    return (
      <section className="border-y border-white/10 bg-[#0c0c0f] px-6 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1280px] rounded-[32px] border border-[#c9a84c]/18 bg-[linear-gradient(135deg,rgba(201,168,76,0.12),rgba(255,255,255,0.03))] p-8 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">
                <Clock3 className="h-3.5 w-3.5" />
                {eyebrow}
              </p>
              <h2 className="mt-4 text-3xl font-semibold md:text-5xl">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/66">{text}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {countdownItems.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-white/10 bg-black/20 px-5 py-4 text-center">
                  <p className="text-3xl font-semibold md:text-4xl">{item.value}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.26em] text-white/50">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (type === "map") {
    const address = typeof config?.address === "string" && config.address.trim()
      ? config.address.trim()
      : "Khusibu, Nayabazar, Kathmandu, Nepal";
    const hours = typeof config?.hours === "string" && config.hours.trim()
      ? config.hours.trim()
      : "Mon — Sat · 11:00 AM — 7:00 PM";

    return (
      <section className={`px-6 py-18 sm:px-8 lg:px-10 ${isDark ? "bg-[#090a0c] text-white" : "bg-white text-[#111111]"}`}>
        <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{eyebrow}</p>
            <h2 className="mt-4 text-3xl font-semibold md:text-5xl">{title}</h2>
            <p className="mt-4 text-sm leading-7 text-white/68">{text}</p>

            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 text-[#c9a84c]" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Address</p>
                  <p className="mt-1 text-sm leading-6 text-white/84">{address}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Hours</p>
                <p className="mt-1 text-sm text-white/84">{hours}</p>
              </div>
            </div>

            <Button
              asChild
              className="mt-8 h-11 rounded-full bg-white px-6 text-[11px] uppercase tracking-[0.22em] text-black hover:bg-white/92"
            >
              <a href={ctaHref} target="_blank" rel="noreferrer">
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3531.8123!2d85.3094!3d27.7214!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb18fc!2sKhusibu%2C%20Kathmandu!5e0!3m2!1sen!2snp!4v1710100000000!5m2!1sen!2snp"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "420px" }}
              allowFullScreen
              loading="lazy"
              title={title}
            />
          </div>
        </div>
      </section>
    );
  }

  const content =
    typeof config?.content === "string" && config.content.trim()
      ? config.content.trim()
      : text;
  const isColumns = variant === "text-columns";

  return (
    <section className={isDark ? "bg-[#0b0c10] text-white" : "bg-[#f8f6f1] text-[#151515]"}>
      <div className="mx-auto max-w-[1320px] px-6 py-18 sm:px-8 lg:px-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c9a84c]">{eyebrow}</p>
        <div className={`mt-5 grid gap-8 ${isColumns ? "lg:grid-cols-[0.72fr_1.28fr]" : "max-w-4xl"}`}>
          <div>
            <h2
              className="text-balance"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(32px, 4.4vw, 62px)", lineHeight: 1 }}
            >
              {title}
            </h2>
          </div>
          <div className={isColumns ? "grid gap-6 md:grid-cols-2" : "max-w-3xl"}>
            {content
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p
                  key={index}
                  className={isDark ? "text-sm leading-7 text-white/70" : "text-sm leading-7 text-[#303030]/82"}
                >
                  {paragraph}
                </p>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
