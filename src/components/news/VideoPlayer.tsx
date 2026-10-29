"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import NewsImage from "@/components/news/NewsImage";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface EmbedCheck {
  id: string;
  embeddable: boolean;
}

// Plays a publisher's YouTube video inside the page using YouTube's own
// official embedded player (privacy-enhanced domain, captions switched on
// when the video has them, no autoplay). Before showing it we ask whether
// the publisher allows embedding; if not, or if we can't tell, the viewer
// gets the thumbnail and a clear "Watch at source" link instead — we never
// try to get around a publisher's restriction.
export default function VideoPlayer({
  videoId,
  title,
  channel,
  watchUrl,
}: {
  videoId: string;
  title: string;
  channel: string;
  watchUrl: string;
}) {
  const { t, language } = useLanguage();
  const [check, setCheck] = useState<EmbedCheck | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/news/embed?id=${encodeURIComponent(videoId)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ embeddable: boolean }>) : { embeddable: false }))
      .then((data) => setCheck({ id: videoId, embeddable: Boolean(data.embeddable) }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setCheck({ id: videoId, embeddable: false });
      });
    return () => controller.abort();
  }, [videoId]);

  const result = check && check.id === videoId ? check : null;
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {result?.embeddable ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&cc_load_policy=1&hl=${language}`}
            title={`${title} — ${channel}`}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            <NewsImage src={thumbnail} className="h-full w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-4 text-center backdrop-blur-[2px]">
              <p className="max-w-xs text-sm text-foreground/90" role="status">
                {result ? t("news.detail.embedBlocked") : t("news.detail.checking")}
              </p>
              {result && (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-azure px-4 py-2 text-sm font-semibold text-background hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {t("news.card.watchAtSource")}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted">
        {channel} · YouTube
      </p>
    </div>
  );
}
