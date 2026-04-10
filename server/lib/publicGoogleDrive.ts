import sharp from "sharp";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { categories, mediaAssets, products } from "@shared/schema";
import { storageService } from "../storage-service";

type DriveEntry = {
  id: string;
  href: string;
  name: string;
  kind: "folder" | "file";
};

type DriveFileNode = {
  id: string;
  name: string;
  folderPath: string;
};

type DriveFolderTraversal = {
  rootFolderName: string;
  rootFolderPath: string;
  folders: string[];
  files: DriveFileNode[];
};

export type DriveImportResult = {
  rootFolderName: string;
  rootFolderPath: string;
  folderCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
};

export type DriveCatalogImportProductResult = {
  folderName: string;
  productName: string;
  status: "created" | "updated" | "skipped";
  imageCount: number;
  colorOptions: string[];
};

export type DriveCatalogImportResult = {
  collectionName: string;
  categoryName: string;
  categorySlug: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  importedAssetCount: number;
  reusedAssetCount: number;
  products: DriveCatalogImportProductResult[];
  errors: string[];
};

const DRIVE_FOLDER_ID_PATTERN = /(?:drive\/folders\/|embeddedfolderview\?id=)([a-zA-Z0-9_-]+)/i;
const DRIVE_ENTRY_PATTERN =
  /<div class="flip-entry" id="entry-([^"]+)"[\s\S]*?<a href="([^"]+)"[^>]*>[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g;
const DRIVE_TITLE_PATTERN = /<title>([\s\S]*?)<\/title>/i;
const MAX_ERROR_DETAILS = 12;
const IMAGE_EXTENSION_PATTERN = /\.(?:avif|heic|heif|jpe?g|png|webp)$/i;
const PRODUCT_FOLDER_SKIP_PATTERN = /(?:^|[\s'_-])(bts|reels?)(?:$|[\s'_-])/i;

const DEFAULT_COLLECTION_NAME = "SS26 Studio Drop";
const DEFAULT_COLLECTION_SLUG = "ss26-studio-drop";
const DEFAULT_PRODUCT_SIZES = ["S", "M", "L", "XL"] as const;

const COLOR_PALETTE = [
  { name: "Ivory", rgb: [232, 226, 214] as const },
  { name: "Stone", rgb: [197, 186, 171] as const },
  { name: "Mocha", rgb: [125, 91, 77] as const },
  { name: "Espresso", rgb: [71, 51, 43] as const },
  { name: "Black", rgb: [27, 27, 31] as const },
  { name: "Forest", rgb: [38, 93, 76] as const },
  { name: "Teal", rgb: [22, 112, 118] as const },
  { name: "Navy", rgb: [42, 54, 92] as const },
] as const;

const DRIVE_PRODUCT_PRESETS: Record<
  string,
  {
    productName: string;
    shortDetails: string;
    description: string;
    price: string;
    costPrice: number;
    stock: number;
    sizes?: string[];
  }
> = {
  "Henley Tee": {
    productName: "SS26 Henley Tee",
    shortDetails: "A studio-clean henley essential with a soft hand feel and relaxed shape.",
    description:
      "Part of the SS26 Studio Drop, this henley tee is mapped from the campaign drive with the full image gallery preserved for merchandising and admin use. It is set up as a clean everyday staple with balanced pricing, launch-ready stock, and a premium editorial presentation.",
    price: "4200",
    costPrice: 1850,
    stock: 18,
  },
  "Plain Half Tee": {
    productName: "SS26 Plain Half Tee",
    shortDetails: "Minimal half-sleeve tee with multiple clean color looks from the SS26 edit.",
    description:
      "This plain half tee anchors the SS26 Studio Drop with an understated fit and wearable palette. The product import keeps the full campaign gallery together and maps image groups into color-led options wherever the studio imagery makes that possible.",
    price: "3600",
    costPrice: 1500,
    stock: 24,
  },
  "Rare Graphic Tee": {
    productName: "SS26 Rare Graphic Tee",
    shortDetails: "Graphic-led tee designed to feel bold in campaign shots and easy in daily wear.",
    description:
      "The Rare Graphic Tee brings the strongest visual identity of the collection into a single product with a complete campaign gallery. It ships with launch-ready pricing, new-arrival tagging, and image groups tuned for the storefront color experience whenever the imported imagery supports it.",
    price: "3800",
    costPrice: 1625,
    stock: 18,
  },
  "Shorts Photo": {
    productName: "SS26 Studio Shorts",
    shortDetails: "Relaxed shorts with a clean line and everyday movement built into the silhouette.",
    description:
      "These SS26 Studio Shorts are imported from the campaign folder with the full visual story attached so the admin catalog stays aligned with the launch assets. The setup favors a versatile everyday short with premium positioning and realistic opening stock.",
    price: "3900",
    costPrice: 1680,
    stock: 14,
  },
  "Terry Full Tee": {
    productName: "SS26 Terry Full Tee",
    shortDetails: "Full-sleeve terry tee with a heavier, lounge-focused SS26 studio attitude.",
    description:
      "The Terry Full Tee is configured as a cozy premium essential inside the SS26 Studio Drop. Imported campaign photography is preserved as gallery media, and the product record includes stronger merchandising copy, launch stock, and inferred color groupings where the imagery clearly supports them.",
    price: "4300",
    costPrice: 1960,
    stock: 16,
  },
  "Terry Half Tee": {
    productName: "SS26 Terry Half Tee",
    shortDetails: "Half-sleeve terry tee with a rich surface texture and a laid-back studio mood.",
    description:
      "This Terry Half Tee rounds out the SS26 Studio Drop with a softer premium build and campaign-backed product imagery. The import keeps the gallery intact for admin and storefront usage while adding a clearer retail description, clean pricing, and launch stock values.",
    price: "3700",
    costPrice: 1540,
    stock: 17,
  },
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function normalizeFolderSegment(value: string, fallback: string): string {
  const cleaned = decodeHtmlEntities(stripHtml(value))
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || fallback;
}

function normalizeFolderPath(...parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function sanitizeUploadFilename(name: string): string {
  const cleaned = decodeHtmlEntities(name)
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");
  return cleaned || `drive-file-${Date.now()}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function buildProductSku(productName: string): string {
  const code = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
  return `RR-${code || "SS26"}`;
}

function getDriveProductPreset(folderName: string) {
  return (
    DRIVE_PRODUCT_PRESETS[folderName] ?? {
      productName: `SS26 ${folderName}`,
      shortDetails: `${folderName} from the SS26 Studio Drop with campaign-backed gallery coverage.`,
      description:
        `${folderName} is imported directly from the public drive collection with full gallery support for the admin catalog and storefront. The product record is completed with launch-ready pricing, stock, and new-arrival flags so it can be merchandised immediately.`,
      price: "3500",
      costPrice: 1450,
      stock: 12,
      sizes: [...DEFAULT_PRODUCT_SIZES],
    }
  );
}

function toHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rn) hue = ((gn - bn) / delta) % 6;
    else if (max === gn) hue = (bn - rn) / delta + 2;
    else hue = (rn - gn) / delta + 4;
  }

  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;

  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return { hue, saturation, lightness };
}

async function inferApparelColorName(imageBuffer: Buffer): Promise<string> {
  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .resize(120, 120, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const xStart = Math.floor(info.width * 0.18);
  const xEnd = Math.ceil(info.width * 0.82);
  const yStart = Math.floor(info.height * 0.15);
  const yEnd = Math.ceil(info.height * 0.88);

  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;
  let weightSum = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const index = (y * info.width + x) * info.channels;
      const r = data[index] ?? 0;
      const g = data[index + 1] ?? 0;
      const b = data[index + 2] ?? 0;
      const { saturation, lightness } = toHsl(r, g, b);

      if (lightness > 0.94 && saturation < 0.16) continue;

      const darknessBoost = lightness < 0.18 ? 1.6 : 1;
      const saturationWeight = Math.max(saturation, 0.12);
      const weight = saturationWeight * darknessBoost;

      weightedR += r * weight;
      weightedG += g * weight;
      weightedB += b * weight;
      weightSum += weight;
    }
  }

  if (weightSum === 0) {
    return "Stone";
  }

  const avgR = weightedR / weightSum;
  const avgG = weightedG / weightSum;
  const avgB = weightedB / weightSum;

  let bestName = "Stone";
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const option of COLOR_PALETTE) {
    const distance =
      Math.pow(avgR - option.rgb[0], 2) +
      Math.pow(avgG - option.rgb[1], 2) +
      Math.pow(avgB - option.rgb[2], 2);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestName = option.name;
    }
  }

  return bestName;
}

function normalizeColorGroups(
  groups: Record<string, string[]>,
): Record<string, string[]> {
  const entries = Object.entries(groups)
    .filter(([, urls]) => urls.length > 0)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  if (entries.length === 0) return {};
  if (entries.length <= 4) return Object.fromEntries(entries);

  const dominant = entries[0][0];
  const merged = new Map<string, string[]>();

  for (const [name, urls] of entries) {
    const targetName =
      urls.length === 1 && name !== dominant ? dominant : name;
    const current = merged.get(targetName) ?? [];
    current.push(...urls);
    merged.set(targetName, current);
  }

  return Object.fromEntries(
    Array.from(merged.entries())
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .slice(0, 4),
  );
}

async function ensureCategory(input: { name: string; slug: string }) {
  const [existing] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.slug, input.slug))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(categories)
    .values({
      name: input.name,
      slug: input.slug,
    })
    .returning({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    });

  return created;
}

function extractPublicDriveFolderId(folderUrlOrId: string): string {
  const trimmed = folderUrlOrId.trim();
  const matched = trimmed.match(DRIVE_FOLDER_ID_PATTERN);
  if (matched?.[1]) return matched[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  throw new Error("Invalid Google Drive folder URL");
}

async function fetchDriveFolderHtml(folderId: string): Promise<string> {
  const response = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#list`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to access Google Drive folder (${response.status})`);
  }

  return response.text();
}

function parseDriveEntries(html: string): { title: string; entries: DriveEntry[] } {
  const titleMatch = html.match(DRIVE_TITLE_PATTERN);
  const title = normalizeFolderSegment(titleMatch?.[1] ?? "", "Drive Import");
  const entries: DriveEntry[] = [];

  let match: RegExpExecArray | null;
  while ((match = DRIVE_ENTRY_PATTERN.exec(html)) !== null) {
    const entryId = match[1]?.trim();
    const href = decodeHtmlEntities(match[2] ?? "").trim();
    const name = normalizeFolderSegment(match[3] ?? "", entryId || "item");
    if (!entryId || !href || !name) continue;

    const kind =
      href.includes("/drive/folders/") || href.includes("embeddedfolderview?id=")
        ? "folder"
        : href.includes("/file/d/")
          ? "file"
          : null;

    if (!kind) continue;

    entries.push({
      id: entryId,
      href,
      name,
      kind,
    });
  }

  DRIVE_ENTRY_PATTERN.lastIndex = 0;

  return { title, entries };
}

async function walkPublicDriveFolder(
  folderId: string,
  destinationPrefix: string,
  seenFolders = new Set<string>(),
): Promise<DriveFolderTraversal> {
  if (seenFolders.has(folderId)) {
    throw new Error("Google Drive folder cycle detected");
  }
  seenFolders.add(folderId);

  const html = await fetchDriveFolderHtml(folderId);
  const { title, entries } = parseDriveEntries(html);
  const currentFolderPath = normalizeFolderPath(destinationPrefix, title);
  const folders = [currentFolderPath];
  const files: DriveFileNode[] = [];

  for (const entry of entries) {
    if (entry.kind === "folder") {
      const child = await walkPublicDriveFolder(entry.id, currentFolderPath, seenFolders);
      folders.push(...child.folders);
      files.push(...child.files);
      continue;
    }

    files.push({
      id: entry.id,
      name: entry.name,
      folderPath: currentFolderPath,
    });
  }

  return {
    rootFolderName: title,
    rootFolderPath: currentFolderPath,
    folders,
    files,
  };
}

async function ensureFolderMarkers(folderPaths: string[], category: string) {
  const uniquePaths = Array.from(new Set(folderPaths.filter(Boolean)));
  if (uniquePaths.length === 0) return;

  const existingRows = await db
    .select({
      folderPath: mediaAssets.folderPath,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.assetType, "folder"),
        eq(mediaAssets.provider, "tigris"),
        eq(mediaAssets.category, category),
        inArray(mediaAssets.folderPath, uniquePaths),
      ),
    );

  const existingSet = new Set(existingRows.map((row) => row.folderPath).filter(Boolean));
  const missingPaths = uniquePaths.filter((path) => !existingSet.has(path));

  if (missingPaths.length === 0) return;

  await db.insert(mediaAssets).values(
    missingPaths.map((folderPath) => ({
      url: null,
      provider: "tigris",
      category,
      publicId: null,
      filename: folderPath.split("/").pop() ?? folderPath,
      bytes: null,
      width: null,
      height: null,
      folderPath,
      assetType: "folder",
      expiresAt: null,
    })),
  );
}

async function downloadDriveImage(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "follow",
    },
  );

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Skipped non-image file (${contentType || "unknown type"})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

export async function importPublicDriveFolderToTigris(input: {
  folderUrl: string;
  category: string;
  destinationFolderPath?: string | null;
}): Promise<DriveImportResult> {
  const folderId = extractPublicDriveFolderId(input.folderUrl);
  const destinationPrefix = normalizeFolderPath(input.destinationFolderPath ?? "");
  const traversal = await walkPublicDriveFolder(folderId, destinationPrefix);

  await ensureFolderMarkers(traversal.folders, input.category);

  const filePlan = traversal.files.map((file) => {
    const sanitizedName = sanitizeUploadFilename(file.name);
    const baseName = sanitizedName.replace(/\.[^.]+$/, "") || `drive-${file.id}`;
    const folderPrefix = file.folderPath ? `${file.folderPath}/` : "";
    const objectKey = `media/${input.category}/${folderPrefix}${file.id}_${baseName}.webp`;

    return {
      ...file,
      objectKey,
      sanitizedName,
    };
  });

  const existingRows =
    filePlan.length === 0
      ? []
      : await db
          .select({
            publicId: mediaAssets.publicId,
          })
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.provider, "tigris"),
              inArray(
                mediaAssets.publicId,
                filePlan.map((file) => file.objectKey),
              ),
            ),
          );

  const existingSet = new Set(existingRows.map((row) => row.publicId).filter(Boolean));

  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const file of filePlan) {
    if (existingSet.has(file.objectKey)) {
      skippedCount += 1;
      continue;
    }

    try {
      const downloaded = await downloadDriveImage(file.id);
      const webpBuffer = await sharp(downloaded.buffer)
        .rotate()
        .webp({ quality: 92, effort: 4 })
        .toBuffer();

      const uploadedUrl = await storageService.uploadFile(
        webpBuffer,
        file.objectKey,
        "image/webp",
      );

      await db.insert(mediaAssets).values({
        url: uploadedUrl,
        provider: "tigris",
        category: input.category,
        publicId: file.objectKey,
        filename: file.name,
        bytes: webpBuffer.byteLength,
        width: null,
        height: null,
        folderPath: file.folderPath,
        assetType: "file",
        expiresAt: null,
      });

      importedCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error";
      if (message.startsWith("Skipped non-image file")) {
        skippedCount += 1;
      } else if (errors.length < MAX_ERROR_DETAILS) {
        errors.push(`${file.name}: ${message}`);
      }
    }
  }

  const failedCount = Math.max(0, filePlan.length - importedCount - skippedCount);

  return {
    rootFolderName: traversal.rootFolderName,
    rootFolderPath: traversal.rootFolderPath,
    folderCount: traversal.folders.length,
    importedCount,
    skippedCount,
    failedCount,
    errors,
  };
}

export async function importPublicDriveProductsToCatalog(input: {
  folderUrl: string;
  collectionName?: string | null;
  collectionSlug?: string | null;
}): Promise<DriveCatalogImportResult> {
  const rootFolderId = extractPublicDriveFolderId(input.folderUrl);
  const rootHtml = await fetchDriveFolderHtml(rootFolderId);
  const { title: rootFolderName, entries } = parseDriveEntries(rootHtml);

  const categoryName = normalizeFolderSegment(
    input.collectionName ?? DEFAULT_COLLECTION_NAME,
    DEFAULT_COLLECTION_NAME,
  );
  const categorySlug =
    slugify(input.collectionSlug ?? categoryName) || DEFAULT_COLLECTION_SLUG;
  await ensureCategory({ name: categoryName, slug: categorySlug });

  const folderEntries = entries.filter(
    (entry) =>
      entry.kind === "folder" &&
      !PRODUCT_FOLDER_SKIP_PATTERN.test(entry.name),
  );

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let importedAssetCount = 0;
  let reusedAssetCount = 0;
  const results: DriveCatalogImportProductResult[] = [];
  const errors: string[] = [];

  for (const folder of folderEntries) {
    const traversal = await walkPublicDriveFolder(folder.id, rootFolderName);
    await ensureFolderMarkers(traversal.folders, "product");

    const imageFiles = traversal.files.filter((file) =>
      IMAGE_EXTENSION_PATTERN.test(file.name),
    );

    if (imageFiles.length === 0) {
      skippedCount += 1;
      results.push({
        folderName: folder.name,
        productName: folder.name,
        status: "skipped",
        imageCount: 0,
        colorOptions: [],
      });
      continue;
    }

    const filePlan = imageFiles.map((file) => {
      const sanitizedName = sanitizeUploadFilename(file.name);
      const baseName =
        sanitizedName.replace(/\.[^.]+$/, "") || `drive-${file.id}`;
      const folderPrefix = file.folderPath ? `${file.folderPath}/` : "";
      const objectKey = `media/product/${folderPrefix}${file.id}_${baseName}.webp`;

      return {
        ...file,
        objectKey,
      };
    });

    const existingRows =
      filePlan.length === 0
        ? []
        : await db
            .select({
              publicId: mediaAssets.publicId,
              url: mediaAssets.url,
            })
            .from(mediaAssets)
            .where(
              and(
                eq(mediaAssets.provider, "tigris"),
                inArray(
                  mediaAssets.publicId,
                  filePlan.map((file) => file.objectKey),
                ),
              ),
            );

    const existingMap = new Map(
      existingRows
        .filter((row): row is { publicId: string; url: string } =>
          Boolean(row.publicId && row.url),
        )
        .map((row) => [row.publicId, row.url]),
    );

    const galleryUrls: string[] = [];
    const rawColorGroups: Record<string, string[]> = {};

    for (const file of filePlan) {
      try {
        const downloaded = await downloadDriveImage(file.id);
        const colorName = await inferApparelColorName(downloaded.buffer);

        let uploadedUrl = existingMap.get(file.objectKey) ?? null;
        if (uploadedUrl) {
          reusedAssetCount += 1;
        } else {
          const webpBuffer = await sharp(downloaded.buffer)
            .rotate()
            .webp({ quality: 92, effort: 4 })
            .toBuffer();

          uploadedUrl = await storageService.uploadFile(
            webpBuffer,
            file.objectKey,
            "image/webp",
          );

          await db.insert(mediaAssets).values({
            url: uploadedUrl,
            provider: "tigris",
            category: "product",
            publicId: file.objectKey,
            filename: file.name,
            bytes: webpBuffer.byteLength,
            width: null,
            height: null,
            folderPath: file.folderPath,
            assetType: "file",
            expiresAt: null,
          });

          importedAssetCount += 1;
        }

        galleryUrls.push(uploadedUrl);
        const urlsForColor = rawColorGroups[colorName] ?? [];
        urlsForColor.push(uploadedUrl);
        rawColorGroups[colorName] = urlsForColor;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown import error";
        if (message.startsWith("Skipped non-image file")) continue;
        if (errors.length < MAX_ERROR_DETAILS) {
          errors.push(`${folder.name}/${file.name}: ${message}`);
        }
      }
    }

    if (galleryUrls.length === 0) {
      skippedCount += 1;
      results.push({
        folderName: folder.name,
        productName: folder.name,
        status: "skipped",
        imageCount: 0,
        colorOptions: [],
      });
      continue;
    }

    const preset = getDriveProductPreset(folder.name);
    const colorImageMap = normalizeColorGroups(rawColorGroups);
    const colorOptions = Object.keys(colorImageMap);
    const sizeOptions = preset.sizes ?? [...DEFAULT_PRODUCT_SIZES];
    const productPayload = {
      name: preset.productName,
      shortDetails: preset.shortDetails,
      description: preset.description,
      price: preset.price,
      costPrice: preset.costPrice,
      sku: buildProductSku(preset.productName),
      imageUrl: galleryUrls[0] ?? null,
      galleryUrls: JSON.stringify(galleryUrls),
      colorImageMap,
      category: categorySlug,
      stock: preset.stock,
      colorOptions:
        colorOptions.length > 0 ? JSON.stringify(colorOptions) : null,
      sizeOptions: JSON.stringify(sizeOptions),
      ranking: 999,
      originalPrice: null,
      salePercentage: 0,
      saleActive: false,
      homeFeatured: false,
      homeFeaturedImageIndex: 1,
      isNewArrival: true,
      isNewCollection: true,
      isActive: preset.stock > 0,
    };

    const [existingProduct] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.name, productPayload.name))
      .limit(1);

    if (existingProduct) {
      await db
        .update(products)
        .set({
          ...productPayload,
          updatedAt: new Date(),
        })
        .where(eq(products.id, existingProduct.id));

      updatedCount += 1;
      results.push({
        folderName: folder.name,
        productName: productPayload.name,
        status: "updated",
        imageCount: galleryUrls.length,
        colorOptions,
      });
    } else {
      await db.insert(products).values(productPayload);
      createdCount += 1;
      results.push({
        folderName: folder.name,
        productName: productPayload.name,
        status: "created",
        imageCount: galleryUrls.length,
        colorOptions,
      });
    }
  }

  return {
    collectionName: rootFolderName,
    categoryName,
    categorySlug,
    createdCount,
    updatedCount,
    skippedCount,
    importedAssetCount,
    reusedAssetCount,
    products: results,
    errors,
  };
}
