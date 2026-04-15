const ALLOWED_REMOTE_IMAGE_HOSTS = [
  "rare.t3.tigrisfiles.io",
  "cdn2.blanxer.com",
  "wsrv.nl",
  "res.cloudinary.com",
];

function isRemoteImageAllowed(src: string): boolean {
  try {
    const url = new URL(src);
    return ALLOWED_REMOTE_IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

export function buildStorefrontImageUrl(
  src: string | null | undefined,
  options: {
    width: number;
    height?: number;
    fit?: "cover" | "contain" | "inside";
    quality?: number;
  },
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
