"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

// A publisher's own picture for a story, or an honest placeholder. Images are
// loaded straight from the publisher (lazily, without sending our page address
// as a referrer). If one has expired or is blocked, the placeholder shows —
// never some other photo standing in for the story.
export default function NewsImage({
  src,
  className = "",
  priority = false,
  compact = false,
  pending = false,
}: {
  src: string | null;
  className?: string;
  priority?: boolean;
  // Small thumbnails show the icon only, without the words.
  compact?: boolean;
  // The publisher's picture is still being looked up.
  pending?: boolean;
}) {
  const { t } = useLanguage();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src && pending) {
    return <div aria-hidden="true" className={`bg-glass-bg-strong motion-safe:animate-pulse ${className}`} />;
  }

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={t("news.card.imageUnavailable")}
        className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-glass-bg-strong to-panel text-muted ${className}`}
      >
        <ImageOff size={compact ? 16 : 22} aria-hidden="true" />
        {!compact && <span className="text-[11px]">{t("news.card.imageUnavailable")}</span>}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- publisher-hosted images from many domains; not in a fixed image allowlist
    <img
      src={src}
      alt=""
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={`bg-glass-bg-strong object-cover ${className}`}
    />
  );
}
