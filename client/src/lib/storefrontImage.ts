const ALLOWED_REMOTE_IMAGE_HOSTS = [
  "rare.t3.tigrisfiles.io",
  "cdn2.blanxer.com",
  "wsrv.nl",
  "res.cloudinary.com",
] as const;

export const STOREFRONT_IMAGE_REMOTE_ORIGINS = ALLOWED_REMOTE_IMAGE_HOSTS.map(
  (host) => `https://${host}`,
);

export type StorefrontImageFit = "cover" | "contain" | "inside";

export type StorefrontImageOptions = {
  width: number;
  height?: number;
  fit?: StorefrontImageFit;
  quality?: number;
};

export type StorefrontImagePreset =
  | "productCardPrimary"
  | "productCardSecondary"
  | "productCardPreview"
  | "productCardPreviewHover"
  | "collectionCard"
  | "pdpStageMobile"
  | "pdpStageDesktop"
  | "galleryThumb"
  | "galleryFullscreen"
  | "relatedProduct";

const STOREFRONT_IMAGE_PRESETS: Record<StorefrontImagePreset, StorefrontImageOptions> = {
  productCardPrimary: {
    width: 560,
    height: 760,
    fit: "cover",
    quality: 68,
  },
  productCardSecondary: {
    width: 560,
    height: 760,
    fit: "cover",
    quality: 64,
  },
  productCardPreview: {
    width: 720,
    height: 960,
    fit: "inside",
    quality: 72,
  },
  productCardPreviewHover: {
    width: 720,
    height: 960,
    fit: "inside",
    quality: 68,
  },
  collectionCard: {
    width: 760,
    height: 950,
    fit: "cover",
    quality: 68,
  },
  pdpStageMobile: {
    width: 1280,
    height: 1600,
    fit: "contain",
    quality: 74,
  },
  pdpStageDesktop: {
    width: 1680,
    height: 2200,
    fit: "cover",
    quality: 78,
  },
  galleryThumb: {
    width: 160,
    height: 200,
    fit: "cover",
    quality: 58,
  },
  galleryFullscreen: {
    width: 1800,
    height: 2400,
    fit: "inside",
    quality: 82,
  },
  relatedProduct: {
    width: 720,
    height: 960,
    fit: "cover",
    quality: 70,
  },
};

function isRemoteImageAllowed(src: string): boolean {
  try {
    const url = new URL(src);
    return ALLOWED_REMOTE_IMAGE_HOSTS.includes(url.hostname as (typeof ALLOWED_REMOTE_IMAGE_HOSTS)[number]);
  } catch {
    return false;
  }
}

export function getStorefrontImagePresetOptions(
  preset: StorefrontImagePreset,
  overrides?: Partial<StorefrontImageOptions>,
): StorefrontImageOptions {
  return {
    ...STOREFRONT_IMAGE_PRESETS[preset],
    ...overrides,
  };
}

export function buildStorefrontImageUrl(
  src: string | null | undefined,
  options: StorefrontImageOptions,
): string {
  if (!src) return "";
  const trimmed = src.trim();
  if (!trimmed) return "";

  const isLocalUpload = trimmed.startsWith("/uploads/");
  const isAllowedRemote =
    (trimmed.startsWith("http://") || trimmed.startsWith("https://")) && isRemoteImageAllowed(trimmed);

  if (!isLocalUpload && !isAllowedRemote) {
    return trimmed;
  }

  const params = new URLSearchParams({
    src: trimmed,
    w: String(Math.max(1, Math.round(options.width))),
  });

  if (options.height) {
    params.set("h", String(Math.max(1, Math.round(options.height))));
  }

  if (options.fit) {
    params.set("fit", options.fit);
  }

  if (options.quality) {
    params.set("q", String(Math.max(30, Math.min(95, Math.round(options.quality)))));
  }

  return "/api/public/image?" + params.toString();
}

export function buildStorefrontPresetImageUrl(
  src: string | null | undefined,
  preset: StorefrontImagePreset,
  overrides?: Partial<StorefrontImageOptions>,
): string {
  return buildStorefrontImageUrl(src, getStorefrontImagePresetOptions(preset, overrides));
}

const STOREFRONT_CARD_FALLBACK_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 960" role="img" aria-hidden="true">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7f4ef" />
        <stop offset="100%" stop-color="#ece6dd" />
      </linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#f4efe7" stop-opacity="0.55" />
      </linearGradient>
    </defs>
    <rect width="720" height="960" fill="url(#bg)" />
    <rect x="104" y="184" width="512" height="592" rx="40" fill="url(#panel)" />
    <rect x="176" y="288" width="368" height="336" rx="28" fill="#ffffff" fill-opacity="0.48" stroke="#d8cfc2" stroke-width="10" />
    <path d="M252 528l72-82 68 78 48-50 56 54v86H252z" fill="#c9beb0" fill-opacity="0.75" />
    <circle cx="322" cy="396" r="30" fill="#d7c8b7" fill-opacity="0.9" />
  </svg>
`;

export const STOREFRONT_CARD_FALLBACK_IMAGE =
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(STOREFRONT_CARD_FALLBACK_SVG)}`;

export function parseStorefrontGalleryUrls(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

export function getStorefrontProductImageSources(
  primarySrc: string | null | undefined,
  galleryValue?: string | null,
): string[] {
  const candidates = [primarySrc, ...parseStorefrontGalleryUrls(galleryValue)];
  const seen = new Set<string>();

  return candidates.reduce<string[]>((acc, candidate) => {
    if (typeof candidate !== "string") return acc;
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized)) return acc;
    seen.add(normalized);
    acc.push(normalized);
    return acc;
  }, []);
}
