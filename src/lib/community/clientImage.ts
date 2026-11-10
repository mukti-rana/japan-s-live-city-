// Prepares a photo in the browser before it is sent: turns it upright, shrinks
// it and writes a fresh JPEG. Drawing onto a canvas and re-encoding creates a
// new file with no camera metadata, so the person's GPS location never leaves
// their device. (The server re-checks and re-encodes everything again.)

export const MAX_EDGE = 1600;
export const MAX_INPUT_BYTES = 30 * 1024 * 1024;
const TARGET_BYTES = 1_200_000;

export type PrepareError = "type" | "size" | "decode";

export class PhotoError extends Error {
  constructor(public code: PrepareError) {
    super(code);
  }
}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  // createImageBitmap applies the camera's rotation when asked; older browsers
  // fall back to an <img>, which applies it by default.
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new PhotoError("decode");
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function preparePhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (!/^image\//.test(file.type) && file.type !== "") throw new PhotoError("type");
  if (file.size > MAX_INPUT_BYTES) throw new PhotoError("size");

  const { source, width, height, release } = await decode(file);
  try {
    if (!width || !height) throw new PhotoError("decode");
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PhotoError("decode");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);

    // Keep quality high unless the file is large; step down until it is small enough.
    let blob: Blob | null = null;
    for (const q of [0.86, 0.78, 0.7, 0.6]) {
      blob = await toBlob(canvas, q);
      if (blob && blob.size <= TARGET_BYTES) break;
    }
    if (!blob) throw new PhotoError("decode");
    return { blob, width: w, height: h };
  } finally {
    release();
  }
}
