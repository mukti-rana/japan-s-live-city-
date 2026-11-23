"use client";

import { useState, useCallback } from "react";
import { AI_LIMITS } from "@/lib/ai/guard";

export interface AttachedImage {
  previewUrl: string;
  base64: string;
  mediaType: string;
}

// The same limit the server enforces (lib/ai/guard.ts), so an image the picker accepts is never refused for size.
const MAX_BYTES = AI_LIMITS.maxImageBytes;

export function useImageAttach() {
  const [image, setImage] = useState<AttachedImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attach = useCallback((file: File) => {
    if (file.size > MAX_BYTES) {
      setError("Image is too large — please attach one under 3MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [, base64] = dataUrl.split(",");
      setImage({ previewUrl: dataUrl, base64, mediaType: file.type });
    };
    reader.readAsDataURL(file);
  }, []);

  const clear = useCallback(() => setImage(null), []);

  return { image, attach, clear, error, clearError: () => setError(null) };
}
