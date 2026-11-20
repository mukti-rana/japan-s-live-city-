"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, RotateCw, Video } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "@/components/citycam/youtube";
import { CITIES, type CitySlug } from "@/lib/data/cities";
import { CITY_CAMS } from "@/lib/data/cityCams";
import { useTranslate } from "@/lib/i18n/inline";

// "SHIBUYA, TOKYO" → "Shibuya, Tokyo", the form the translation memory keeps.
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s,])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

const glass = "border border-white/15 bg-black/55 backdrop-blur-xl";

// The cameras are public YouTube live streams, shown in YouTube's own embedded player (same sources as ever). The picture stands alone, like a webcam: the player is
// started muted, its own control bar is off (a supported setting) and it takes no pointer of its own, so pointing at it brings up nothing, neither YouTube's hover
// panel (share, watch later, "More videos") nor any control of ours. The player is still driven through YouTube's official IFrame API, so the page can load another
// city into it and say plainly when a stream cannot be played here. YouTube's logo and title are NOT hidden, covered or cropped (YouTube's embed terms forbid
// that): they show where YouTube puts them, and the stream's owner stays credited beside the picture.
export default function LiveCityCamCard() {
  const [citySlug, setCitySlug] = useState<CitySlug>("tokyo");
  const cam = CITY_CAMS[citySlug];
  const tr = useTranslate();
  const location = tr(titleCase(cam.location)).toUpperCase();

  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const slugRef = useRef(citySlug);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  // The real player: made once, then told which stream to load.
  useEffect(() => {
    let dead = false;
    loadYouTubeApi()
      .then((YT) => {
        if (dead || !host.current) return;
        const p = new YT.Player(host.current, {
          videoId: CITY_CAMS[slugRef.current].videoId,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1, disablekb: 1, origin: window.location.origin },
          events: {
            onReady: () => {
              if (!dead) player.current = p;
            },
            onStateChange: (e) => {
              if (!dead && e.data === YT_STATE.PLAYING) setPhase("ready");
            },
            onError: () => {
              if (!dead) setPhase("error");
            },
          },
        });
      })
      .catch(() => {
        if (!dead) setPhase("error");
      });
    return () => {
      dead = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  const choose = useCallback((next: CitySlug) => {
    if (next === slugRef.current) return;
    slugRef.current = next;
    setCitySlug(next);
    setPhase("loading");
    player.current?.loadVideoById(CITY_CAMS[next].videoId);
  }, []);

  const retry = () => {
    setPhase("loading");
    player.current?.loadVideoById(CITY_CAMS[slugRef.current].videoId);
  };

  return (
    <WidgetFrame icon={Video} labelKey="citycam.title" accent="mint" live>
      <div className="flex items-center gap-1.5">
        {CITIES.map((city) => (
          <button
            key={city.slug}
            type="button"
            onClick={() => choose(city.slug)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              citySlug === city.slug
                ? "bg-azure/20 text-azure"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tr(city.name)}
          </button>
        ))}
      </div>

      <div className="keep-dark-ink relative aspect-video w-full flex-1 overflow-hidden rounded-xl bg-[#0a1024]">
        {/* The player takes no pointer (pointer-events-none): nothing pops up over the picture. */}
        <div className="pointer-events-none absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full">
          <div ref={host} />
        </div>

        {phase !== "ready" && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center ${phase === "loading" ? "pointer-events-none bg-[#0a1024]/85" : "bg-[#0a1024]"}`}>
            {phase === "loading" ? (
              <Loader2 size={22} className="animate-spin text-white/70 motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <>
                <p className="max-w-xs text-sm font-medium text-white">{tr("This camera can't be played here right now.")}</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={retry} className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${glass}`}>
                    <RotateCw size={14} aria-hidden="true" />
                    {tr("Try again")}
                  </button>
                  <a href={cam.watchUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${glass}`}>
                    {tr("Watch on YouTube")}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-[#0a0a0b]/85 to-transparent p-3">
          <p className="font-mono text-[10px] text-foreground/80">{location}</p>
          <a
            href={cam.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto flex items-center gap-1 text-[10px] text-foreground/60 hover:text-foreground"
          >
            {cam.source}
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </WidgetFrame>
  );
}
