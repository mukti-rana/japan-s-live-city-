import sharp from "sharp";

// What the server does to every photo before it is stored. The browser has
// already shrunk and re-encoded it, but the server never relies on that:
//   - the file must really be a picture of a supported kind (checked from its
//     contents, not its name or declared type) and not absurdly large;
//   - it is turned upright, then re-encoded to WebP at two sizes. Re-encoding
//     writes a brand-new file with NO camera metadata, so GPS location,
//     device details and timestamps are gone;
//   - the result is what is stored; the original is never kept.

export const FULL_EDGE = 1600;
export const THUMB_EDGE = 640;
const MIN_EDGE = 200;
const MAX_INPUT_PIXELS = 40_000_000;
const SUPPORTED = new Set(["jpeg", "png", "webp", "avif"]);

export type PhotoResult =
  | { ok: true; full: Buffer; thumb: Buffer; width: number; height: number }
  | { ok: false; reason: "unsupported" | "tooSmall" | "tooLarge" | "unreadable" };

export async function processPhoto(input: Buffer): Promise<PhotoResult> {
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!meta.format || !SUPPORTED.has(meta.format)) return { ok: false, reason: "unsupported" };
    // EXIF orientation 5-8 means the stored width and height are swapped.
    const rotated = (meta.orientation ?? 1) >= 5;
    const w = (rotated ? meta.height : meta.width) ?? 0;
    const h = (rotated ? meta.width : meta.height) ?? 0;
    if (w * h > MAX_INPUT_PIXELS) return { ok: false, reason: "tooLarge" };
    if (Math.min(w, h) < MIN_EDGE) return { ok: false, reason: "tooSmall" };

    const base = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
    const fullOut = await base()
      .resize({ width: FULL_EDGE, height: FULL_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await base()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    return { ok: true, full: fullOut.data, thumb, width: fullOut.info.width, height: fullOut.info.height };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/pixel limit|too large/i.test(message)) return { ok: false, reason: "tooLarge" };
    return { ok: false, reason: "unreadable" };
  }
}
