import fs from "fs";
import path from "path";

function isWritableDir(dirPath: string): boolean {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a usable uploads directory for this environment.
 *
 * - Railway/production: if `UPLOADS_DIR` is set but not writable, fail loudly
 *   so we don't silently write uploads to an ephemeral filesystem.
 * - Development: if `UPLOADS_DIR` is not writable, fall back to local `./uploads`
 *   so the dev server can still run.
 */
export function resolveUploadsDir(): string {
  const localFallback = path.join(process.cwd(), "uploads");
  const configured = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : localFallback;

  if (isWritableDir(configured)) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[UPLOADS] UPLOADS_DIR is not writable: ${configured}. ` +
        `Ensure your Railway persistent disk/volume is mounted and writable at that path.`,
    );
  }

  console.warn(
    `[UPLOADS] WARNING: Configured UPLOADS_DIR not writable (${configured}). ` +
      `Falling back to local uploads folder (${localFallback}).`,
  );
  // Local fallback should be writable; if it isn't, let it throw naturally.
  fs.mkdirSync(localFallback, { recursive: true });
  return localFallback;
}

