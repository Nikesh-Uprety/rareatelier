import sharp from "sharp";
import { resolveS3ConfigFromEnv, tryNormalizeStoredObjectUrl } from "../s3-upload";
import { storageService } from "../storage-service";

export type MediaUploadQualityMode = "medium" | "high";

const ORIGINAL_MAX_DIMENSION = 2200;
const PREVIEW_MAX_DIMENSION = 1400;
const THUMBNAIL_DIMENSION = 480;

function splitExtension(objectKey: string): { baseKey: string; extension: string } {
  const match = objectKey.match(/\.[a-z0-9]+$/i);
  if (!match) {
    return { baseKey: objectKey, extension: "" };
  }

  return {
    baseKey: objectKey.slice(0, -match[0].length),
    extension: match[0],
  };
}

export function buildTigrisDerivedObjectKeys(objectKey: string): {
  originalKey: string;
  thumbnailKey: string;
  previewKey: string;
} {
  const { baseKey, extension } = splitExtension(objectKey);
  const safeExtension = extension || ".webp";

  return {
    originalKey: `${baseKey}${safeExtension}`,
    thumbnailKey: `${baseKey}__thumb${safeExtension}`,
    previewKey: `${baseKey}__preview${safeExtension}`,
  };
}

export function extractTigrisObjectKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const normalizedUrl = tryNormalizeStoredObjectUrl(url) ?? url;

  try {
    const parsed = new URL(normalizedUrl);
    let key = parsed.pathname.replace(/^\/+/, "");

    try {
      const config = resolveS3ConfigFromEnv();
      const normalizedBucket = config.bucket.replace(/^\/+|\/+$/g, "");
      if (normalizedBucket && key.startsWith(`${normalizedBucket}/`)) {
        key = key.slice(normalizedBucket.length + 1);
      }
    } catch {
      // Ignore env parsing errors and fall back to the URL pathname.
    }

    return key || null;
  } catch {
    return null;
  }
}

export async function buildAdminMediaRenditions(
  sourceBuffer: Buffer,
  qualityMode: MediaUploadQualityMode = "high",
): Promise<{
  originalBuffer: Buffer;
  thumbnailBuffer: Buffer;
  previewBuffer: Buffer;
  width: number | null;
  height: number | null;
}> {
  const base = sharp(sourceBuffer).rotate();
  const originalQuality = qualityMode === "high" ? 92 : 85;
  const previewQuality = qualityMode === "high" ? 78 : 72;
  const thumbnailQuality = qualityMode === "high" ? 72 : 66;

  const [{ data: originalBuffer, info }, previewBuffer, thumbnailBuffer] = await Promise.all([
    base
      .clone()
      .resize({
        width: ORIGINAL_MAX_DIMENSION,
        height: ORIGINAL_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: originalQuality, effort: 4 })
      .toBuffer({ resolveWithObject: true }),
    base
      .clone()
      .resize({
        width: PREVIEW_MAX_DIMENSION,
        height: PREVIEW_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: previewQuality, effort: 4 })
      .toBuffer(),
    base
      .clone()
      .resize({
        width: THUMBNAIL_DIMENSION,
        height: THUMBNAIL_DIMENSION,
        fit: "cover",
        position: "attention",
      })
      .webp({ quality: thumbnailQuality, effort: 4 })
      .toBuffer(),
  ]);

  return {
    originalBuffer,
    previewBuffer,
    thumbnailBuffer,
    width: typeof info.width === "number" ? info.width : null,
    height: typeof info.height === "number" ? info.height : null,
  };
}

export async function uploadTigrisMediaRenditions(input: {
  sourceBuffer: Buffer;
  objectKey: string;
  qualityMode?: MediaUploadQualityMode;
}): Promise<{
  url: string;
  thumbnailUrl: string;
  previewUrl: string;
  bytes: number;
  width: number | null;
  height: number | null;
}> {
  const qualityMode = input.qualityMode ?? "high";
  const renditionKeys = buildTigrisDerivedObjectKeys(input.objectKey);
  const renditions = await buildAdminMediaRenditions(input.sourceBuffer, qualityMode);

  const [url, thumbnailUrl, previewUrl] = await Promise.all([
    storageService.uploadFile(renditions.originalBuffer, renditionKeys.originalKey, "image/webp"),
    storageService.uploadFile(renditions.thumbnailBuffer, renditionKeys.thumbnailKey, "image/webp"),
    storageService.uploadFile(renditions.previewBuffer, renditionKeys.previewKey, "image/webp"),
  ]);

  return {
    url,
    thumbnailUrl,
    previewUrl,
    bytes: renditions.originalBuffer.byteLength,
    width: renditions.width,
    height: renditions.height,
  };
}
