import type { SiteBranding } from "@/lib/adminApi";

export type StorefrontLogoPreset = {
  id: string;
  label: string;
  description: string;
  logoUrl: string;
  logoDarkUrl?: string;
  previewBackground?: string;
  previewClassName?: string;
};

export const STOREFRONT_BRANDING_QUERY_KEY = ["/api/public/branding"] as const;

export const STOREFRONT_LOGO_PRESETS: StorefrontLogoPreset[] = [
  {
    id: "updated-wordmark",
    label: "Updated Wordmark",
    description: "The previous storefront logo with automatic contrast handling across light and dark surfaces.",
    logoUrl: "/images/updatedlogo.png",
    previewBackground: "#ffffff",
    previewClassName: "max-h-12",
  },
  {
    id: "monogram-mark",
    label: "Monogram Mark",
    description: "Compact logo mark preset for the landing page and navigation.",
    logoUrl: "/images/logo.webp",
    logoDarkUrl: "/images/logo.webp",
    previewBackground: "#000000",
    previewClassName: "max-h-24",
  },
  {
    id: "current-wordmark",
    label: "Current Wordmark",
    description: "The active Rare Atelier horizontal wordmark used across the storefront.",
    logoUrl: "/images/newproductpagelogo-removebg-preview.png",
    logoDarkUrl: "/images/newproductpagelogo-removebg-preview.png",
    previewBackground: "#ffffff",
    previewClassName: "max-h-12",
  },
  {
    id: "legacy-wordmark",
    label: "Legacy Wordmark",
    description: "The previous storefront wordmark for quick rollback and comparison.",
    logoUrl: "/images/newproductpagelogo.png",
    logoDarkUrl: "/images/newproductpagelogo.png",
    previewBackground: "#ffffff",
    previewClassName: "max-h-12",
  },
];

const FALLBACK_LIGHT_LOGO_URL = "/images/updatedlogo.png";
const FALLBACK_DARK_LOGO_URL = "/images/updatedlogo.png";

export function resolveStorefrontLogo(
  branding: Pick<SiteBranding, "logoUrl" | "logoDarkUrl"> | null | undefined,
  variant: "light" | "dark",
) {
  const lightSrc = branding?.logoUrl || FALLBACK_LIGHT_LOGO_URL;
  const darkSrc = branding?.logoDarkUrl || branding?.logoUrl || FALLBACK_DARK_LOGO_URL;

  return {
    src: variant === "dark" ? darkSrc : lightSrc,
    fallbackLightSrc: FALLBACK_LIGHT_LOGO_URL,
    fallbackDarkSrc: FALLBACK_DARK_LOGO_URL,
    hasCustomLightLogo: Boolean(branding?.logoUrl),
    hasCustomDarkLogo: Boolean(branding?.logoDarkUrl),
  };
}

export function getStorefrontLogoFilter(options: {
  branding: Pick<SiteBranding, "logoUrl" | "logoDarkUrl"> | null | undefined;
  variant: "light" | "dark";
  glow?: boolean;
}) {
  const { branding, variant, glow = false } = options;
  const usingUploadedVariant =
    variant === "dark" ? Boolean(branding?.logoDarkUrl) : Boolean(branding?.logoUrl);

  if (usingUploadedVariant) {
    return glow
      ? "drop-shadow(0 0 18px rgba(255,255,255,0.18))"
      : "none";
  }

  if (variant === "dark") {
    return glow
      ? "brightness(0) invert(1) drop-shadow(0 0 22px rgba(255,255,255,0.42)) drop-shadow(0 0 38px rgba(255,255,255,0.18))"
      : "brightness(0) invert(1)";
  }

  return "brightness(0)";
}

export function matchesLogoPreset(
  branding: Pick<SiteBranding, "logoUrl" | "logoDarkUrl"> | null | undefined,
  preset: StorefrontLogoPreset,
) {
  const activeLight = branding?.logoUrl || FALLBACK_LIGHT_LOGO_URL;
  const activeDark = branding?.logoDarkUrl || branding?.logoUrl || FALLBACK_DARK_LOGO_URL;
  const presetDark = preset.logoDarkUrl ?? preset.logoUrl;

  return activeLight === preset.logoUrl && activeDark === presetDark;
}
