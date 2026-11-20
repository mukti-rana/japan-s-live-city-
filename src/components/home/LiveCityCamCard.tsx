"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, Loader2, Maximize2, Minimize2, Pause, Play, RotateCw, Video, Volume2, VolumeX } from "lucide-react";
import WidgetFrame from "@/components/home/WidgetFrame";
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "@/components/citycam/youtube";
import { CITIES, type CitySlug } from "@/lib/data/cities";
import { CITY_CAMS } from "@/lib/data/cityCams";
import { useTranslate } from "@/lib/i18n/inline";

// "SHIBUYA, TOKYO" → "Shibuya, Tokyo", the form the translation memory keeps.
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s,])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());

const glass = "border border-white/15 bg-black/55 backdrop-blur-xl";
const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

// The cameras are public YouTube live streams, shown in YouTube's own embedded player (same sources as ever). The player is driven through YouTube's official
// IFrame API: its own control bar is switched off (a supported setting) and the page's small controls (play, pause, mute, volume, fullscreen) stand in for it,
// so pointing at the picture no longer brings up YouTube's hover panel (share, watch later, "More videos"). The player takes no pointer of its own, which is what
// keeps that panel away; its logo and title are NOT hidden, covered or cropped (YouTube's embed terms forbid that): they show where YouTube puts them, and the
// stream's owner stays credited beside the picture.
export default function LiveCityCamCard() {
  const [citySlug, setCitySlug] = useState<CitySlug>("tokyo");
  const cam = CITY_CAMS[citySlug];
  const tr = useTranslate();
  const location = tr(titleCase(cam.location)).toUpperCase();

  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const slugRef = useRef(citySlug);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(70);
  const [fs, setFs] = useState(false);
  const canFs = useSyncExternalStore(
    () => () => {},
    () => Boolean(document.fullscreenEnabled),
    () => false,
  );

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
              if (dead) return;
              player.current = p;
              setMuted(p.isMuted());
              setVolume(p.getVolume());
            },
            onStateChange: (e) => {
              if (dead) return;
              if (e.data === YT_STATE.PLAYING) {
                setPhase("ready");
                setPlaying(true);
              } else if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.ENDED) setPlaying(false);
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
    setPlaying(true);
    player.current?.loadVideoById(CITY_CAMS[next].videoId);
  }, []);

  const retry = () => {
    setPhase("loading");
    player.current?.loadVideoById(CITY_CAMS[slugRef.current].videoId);
  };

  useEffect(() => {
    const on = () => setFs(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen();
  };
  const togglePlay = () => (playing ? player.current?.pauseVideo() : player.current?.playVideo());
  const toggleMute = () => {
    const p = player.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unMute();
      if (p.getVolume() === 0) p.setVolume(40);
      setVolume(p.getVolume());
      setMuted(false);
    } else {
      p.mute();
      setMuted(true);
    }
  };
  const changeVolume = (v: number) => {
    const p = player.current;
    setVolume(v);
    if (!p) return;
    p.setVolume(v);
    if (v === 0) {
      p.mute();
      setMuted(true);
    } else if (p.isMuted()) {
      p.unMute();
      setMuted(false);
    }
  };

  const controlsShown = !playing || phase !== "ready";

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

      <div ref={frame} className="keep-dark-ink group/cam relative aspect-video w-full flex-1 overflow-hidden rounded-xl bg-[#0a1024] [&:fullscreen]:aspect-auto [&:fullscreen]:h-full [&:fullscreen]:rounded-none">
        {/* The player takes no pointer (pointer-events-none), so YouTube's hover panel never opens; the page's own controls below do the work. */}
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

        {/* Bottom centre: the controls, on hover or focus, whenever it is paused, and always on a touch screen. */}
        {phase !== "error" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-9 flex justify-center">
            <div className={`pointer-events-auto flex items-center gap-0.5 rounded-full p-1 transition-all duration-300 ease-out motion-reduce:transition-none ${glass} ${controlsShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover/cam:translate-y-0 group-hover/cam:opacity-100 group-focus-within/cam:translate-y-0 group-focus-within/cam:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"}`}>
              <button type="button" onClick={togglePlay} aria-label={playing ? tr("Pause") : tr("Play")} className={iconBtn}>
                {playing ? <Pause size={16} aria-hidden="true" fill="currentColor" /> : <Play size={16} aria-hidden="true" fill="currentColor" />}
              </button>
              <button type="button" onClick={toggleMute} aria-label={muted ? tr("Unmute") : tr("Mute")} aria-pressed={muted} className={iconBtn}>
                {muted || volume === 0 ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
              </button>
              <input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))} aria-label={tr("Volume")} className="mx-1 hidden h-1 w-16 cursor-pointer accent-white sm:block" />
              {canFs && (
                <button type="button" onClick={toggleFs} aria-label={fs ? tr("Exit fullscreen") : tr("Fullscreen")} className={iconBtn}>
                  {fs ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
                </button>
              )}
            </div>
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
