"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ExternalLink, Loader2, Maximize2, Minimize2, Pause, Play, RotateCw, Video, Volume2, VolumeX } from "lucide-react";
import T from "@/components/i18n/T";
import { loadYouTubeApi, YT_STATE, type YTPlayer } from "@/components/citycam/youtube";
import { CITIES, type CitySlug } from "@/lib/data/cities";
import { CITY_CAMS } from "@/lib/data/cityCams";
import { useTranslate } from "@/lib/i18n/inline";

// LIVE CITY CAM: the cameras (Osaka, Kyoto, Tokyo) are public YouTube live streams, shown in YouTube's own embedded player, large, on black, with the
// page's own information round it (not over the footage). The page never claims more than it knows:
//   LIVE         only when a source confirms the broadcast is on air: YouTube's own page for the stream (read by the server, /api/citycam/status) or the
//                player itself reporting a live broadcast;
//   Offline      when the stream's page says it is not on air, or the player cannot play it;
//   Connecting   while the player starts;
//   Status unavailable   when nothing could confirm either way.
// The custom controls (play, pause, mute, volume, fullscreen) drive the real player through YouTube's IFrame API; the player's own controls are
// switched off (a supported parameter) because these replace them, and its branding and links stay where YouTube puts them: the bottom-right
// corner is left clear of anything of ours, and "Watch on YouTube" is always beside the player. Nothing is a recording passed off as live.

type Phase = "loading" | "ready" | "slow" | "error";
type Verdict = "live" | "offline" | "unknown";
type Server = Record<string, { state: Verdict; checkedAt: string }>;

// "SHIBUYA, TOKYO" → "Shibuya, Tokyo", the form the translation memory keeps.
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s,])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
const jst = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const jstShort = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false });

const glass = "border border-white/15 bg-black/55 backdrop-blur-xl";
const iconBtn = "flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

function StatusChip({ kind, label, size = "md" }: { kind: "live" | "connecting" | "offline" | "unavailable"; label: string; size?: "sm" | "md" }) {
  const tone = {
    live: "border-[#4ade80]/35 bg-[#4ade80]/10 text-[#4ade80]",
    connecting: "border-[#ffb347]/35 bg-[#ffb347]/10 text-[#ffb347]",
    offline: "border-white/20 bg-white/[0.06] text-white/75",
    unavailable: "border-[#a98bff]/35 bg-[#a98bff]/10 text-[#c4b5fd]",
  }[kind];
  const dot = { live: "bg-[#4ade80]", connecting: "bg-[#ffb347]", offline: "bg-white/50", unavailable: "bg-[#a98bff]" }[kind];
  return (
    <span role="status" className={`inline-flex items-center gap-2 rounded-full border font-medium ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} ${tone}`}>
      <span className="relative flex h-2 w-2">
        {(kind === "live" || kind === "connecting") && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${dot}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  );
}

export default function CityCam() {
  const tr = useTranslate();
  const reduced = useReducedMotion();
  const [slug, setSlug] = useState<CitySlug>("tokyo");
  const cam = CITY_CAMS[slug];
  const city = CITIES.find((c) => c.slug === slug) ?? CITIES[0];

  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const slugRef = useRef(slug);
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(70);
  const [playerLive, setPlayerLive] = useState<boolean | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [server, setServer] = useState<Server>({});
  const [now, setNow] = useState<Date | null>(null);
  const [fs, setFs] = useState(false);
  // The controls show for a few seconds when the picture starts, so they are found; after that, on hover or focus.
  const [peek, setPeek] = useState(false);
  // Fullscreen is offered only where the browser allows it (not on an iPhone, for instance, where the official player's own button is not available either).
  const canFs = useSyncExternalStore(
    () => () => {},
    () => Boolean(document.fullscreenEnabled),
    () => false,
  );

  // The Japan clock.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  // Whether each stream is on air, as YouTube's pages say (read by the server, kept a minute); asked again every minute and a half.
  useEffect(() => {
    let live = true;
    const ask = () =>
      fetch("/api/citycam/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { cams?: Server } | null) => {
          if (live && d?.cams) setServer(d.cams);
        })
        .catch(() => {});
    ask();
    const id = window.setInterval(ask, 90_000);
    return () => {
      live = false;
      window.clearInterval(id);
    };
  }, []);

  // The real player. It is made once and then told which stream to load; the page never rebuilds it just to change camera.
  useEffect(() => {
    let dead = false;
    loadYouTubeApi()
      .then((YT) => {
        if (dead || !host.current) return;
        const id = CITY_CAMS[slugRef.current].videoId;
        const p = new YT.Player(host.current, {
          videoId: id,
          width: "100%",
          height: "100%",
          playerVars: { autoplay: 1, mute: 1, controls: 0, rel: 0, playsinline: 1, iv_load_policy: 3, modestbranding: 1, origin: window.location.origin },
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
                setPeek(true);
                const d = p.getVideoData();
                // Only the stream that is playing now may speak for the camera on screen.
                if (d?.video_id === CITY_CAMS[slugRef.current].videoId) {
                  setPlayerLive(d.isLive === true ? true : d.isLive === false ? false : null);
                  if (d.isLive === true) setConfirmedAt(new Date().toISOString());
                }
              } else if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.ENDED) setPlaying(false);
            },
            onError: (e) => {
              if (dead) return;
              setErrorCode(e.data);
              setPhase("error");
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

  // Choosing another camera: the same player loads that stream.
  const choose = useCallback((next: CitySlug) => {
    if (next === slugRef.current) return;
    slugRef.current = next;
    setSlug(next);
    setPhase("loading");
    setErrorCode(null);
    setPlayerLive(null);
    setConfirmedAt(null);
    setPlaying(true);
    player.current?.loadVideoById(CITY_CAMS[next].videoId);
  }, []);

  const retry = useCallback(() => {
    setPhase("loading");
    setErrorCode(null);
    setPlayerLive(null);
    player.current?.loadVideoById(CITY_CAMS[slugRef.current].videoId);
  }, []);

  // A player that has not started after a while says so (some browsers hold back autoplay), instead of showing a spinner for ever.
  useEffect(() => {
    if (phase !== "loading") return;
    const id = window.setTimeout(() => setPhase((p) => (p === "loading" ? "slow" : p)), 18_000);
    return () => window.clearTimeout(id);
  }, [phase, slug]);

  useEffect(() => {
    if (!peek) return;
    const id = window.setTimeout(() => setPeek(false), 4500);
    return () => window.clearTimeout(id);
  }, [peek]);

  // Fullscreen is the page's own frame (the player inside it), so the player's branding comes with it.
  useEffect(() => {
    const on = () => setFs(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFs = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.current?.requestFullscreen();
  };

  const togglePlay = () => {
    const p = player.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  };
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

  // What to say about the stream. LIVE only on a confirmation; the player reporting a recording is not live whatever the page said.
  const answer = server[slug];
  const verdict: Verdict = playerLive === true ? "live" : playerLive === false ? "offline" : (answer?.state ?? "unknown");
  // A player error is not proof the stream is off: 100 means the video is gone or private (offline); 101 and 150 mean its owner does not allow it to be played
  // outside YouTube (it may well be live there), so those say only that the status is unavailable here.
  const embedBlocked = errorCode === 101 || errorCode === 150;
  const kind: "live" | "connecting" | "offline" | "unavailable" = phase === "error" ? (errorCode === 100 ? "offline" : "unavailable") : phase === "loading" ? "connecting" : verdict === "live" ? "live" : verdict === "offline" ? "offline" : "unavailable";
  const statusText = { live: tr("Live"), connecting: tr("Connecting"), offline: tr("Offline"), unavailable: tr("Status unavailable") }[kind];
  const checked = playerLive === true && confirmedAt ? { at: confirmedAt, by: tr("Confirmed by the player") } : answer && answer.state !== "unknown" ? { at: answer.checkedAt, by: tr("Confirmed by YouTube") } : null;
  const cameraName = titleCase(cam.location.split(",")[0]);
  const location = titleCase(cam.location);
  const shown = (iso: string) => jstShort.format(new Date(iso));

  const ease = [0.22, 1, 0.36, 1] as const;
  const controlsShown = !playing || phase !== "ready" || peek;

  return (
    <section aria-labelledby="citycam-h" className="relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-[#040406] p-4 shadow-[0_40px_100px_-50px_rgba(0,0,0,1)] sm:p-6 lg:p-7">
      {/* A very faint wash of amber, blue and violet in the corners; the footage is the light. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_0%_0%,rgba(255,179,71,0.07),transparent),radial-gradient(55%_45%_at_100%_0%,rgba(93,176,255,0.08),transparent),radial-gradient(60%_50%_at_50%_110%,rgba(169,139,255,0.08),transparent)]" />

      {/* The camera's own header: outside the footage. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#4ade80]/25 bg-[#4ade80]/10 text-[#4ade80]">
            <Video size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 id="citycam-h" className="text-sm font-semibold uppercase tracking-[0.2em] text-white">
              <T k="citycam.title" />
            </h3>
            <p className="mt-0.5 truncate text-xs text-white/60">
              {tr(city.name)} · {tr(cameraName)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs tabular-nums text-white/60 min-[420px]:block" aria-label={tr("Japan Standard Time")}>
            <span className="text-white/40">JST </span>
            <span className="text-sm font-medium text-white/85">{now ? jst.format(now) : "--:--:--"}</span>
          </p>
          <StatusChip kind={kind} label={statusText} />
        </div>
      </div>

      {/* The camera selector: a lit pill slides to the chosen city; each shows its camera, and a dot when its stream is known to be on air. */}
      <div role="group" aria-label={tr("Choose a camera")} className="mt-4 flex gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CITIES.map((c) => {
          const on = c.slug === slug;
          const camC = CITY_CAMS[c.slug];
          const st = server[c.slug]?.state;
          return (
            <button
              key={c.slug}
              type="button"
              aria-pressed={on}
              onClick={() => choose(c.slug)}
              className={`relative flex min-w-0 flex-1 flex-col items-start rounded-xl px-3 py-2.5 text-left sm:px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "text-white" : "text-white/60 hover:text-white"}`}
            >
              {on && <motion.span layoutId="citycam-pill" transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl border border-white/20 bg-white/[0.09] shadow-[0_10px_30px_-14px_rgba(93,176,255,0.7)]" aria-hidden="true" />}
              <span className="relative flex max-w-full items-center gap-2 text-sm font-semibold">
                {tr(c.name)}
                {st === "live" && <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" aria-label={tr("Live")} />}
              </span>
              <span className="relative mt-0.5 block max-w-full truncate text-xs text-white/50">{tr(titleCase(camC.location.split(",")[0]))}</span>
            </button>
          );
        })}
      </div>

      {/* The player: the footage, large and at its true 16:9, with only the controls over it, and only on hover or focus (always on a touch screen). */}
      <div
        ref={frame}
        className="group/cam relative mt-4 aspect-video w-full overflow-hidden rounded-2xl border border-white/12 bg-black shadow-[0_30px_80px_-40px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.03)] [&:fullscreen]:aspect-auto [&:fullscreen]:h-full [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      >
        <div className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full">
          <div ref={host} />
        </div>

        {/* Loading, slow and error states, in the player's own frame. */}
        <AnimatePresence>
          {phase !== "ready" && (
            <motion.div
              key={`${slug}-${phase}`}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.4, ease }}
              className={`absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center sm:gap-3 sm:px-6 ${phase === "loading" ? "pointer-events-none bg-[#040406]/90" : "bg-[#040406]"}`}
            >
              {phase === "loading" ? (
                <>
                  <Loader2 size={26} className="animate-spin text-white/70 motion-reduce:animate-none" aria-hidden="true" />
                  <p className="text-sm text-white/75">{tr("Connecting to {name}…").replace("{name}", tr(cameraName))}</p>
                </>
              ) : (
                <>
                  <p className="max-w-sm text-sm font-medium leading-snug text-white sm:text-base">{phase === "slow" ? tr("This is taking longer than usual.") : embedBlocked ? tr("This stream can't be played here: its owner restricts it to YouTube, or it needs a sign-in.") : tr("This camera can't be played here right now.")}</p>
                  {phase === "error" && errorCode !== null && !embedBlocked && <p className="text-xs text-white/50">{tr("The player reported an error")} ({errorCode})</p>}
                  <div className="mt-0.5 flex items-center justify-center gap-2 sm:mt-1">
                    <button type="button" onClick={retry} className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium text-white hover:bg-white/15 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${glass}`}>
                      <RotateCw size={15} aria-hidden="true" />
                      {tr("Try again")}
                    </button>
                    <a href={cam.watchUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium text-white hover:bg-white/15 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${glass}`}>
                      {tr("Watch on YouTube")}
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top right: the status, revealed with the controls. */}
        <div className={`pointer-events-none absolute right-3 top-3 transition-all duration-300 ease-out motion-reduce:transition-none ${phase !== "ready" ? "hidden" : ""} ${controlsShown ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0 group-hover/cam:translate-y-0 group-hover/cam:opacity-100 group-focus-within/cam:translate-y-0 group-focus-within/cam:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"}`}>
          <div className={`rounded-full ${glass}`}>
            <StatusChip kind={kind} label={`${statusText} · ${tr(city.name)}`} size="sm" />
          </div>
        </div>

        {/* Bottom centre: the controls. YouTube keeps the bottom corners (its share button at the left; "More videos" and its logo at the right). */}
        {phase !== "error" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <div className={`pointer-events-auto flex items-center gap-0.5 rounded-full p-1 transition-all duration-300 ease-out motion-reduce:transition-none ${glass} ${controlsShown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 group-hover/cam:translate-y-0 group-hover/cam:opacity-100 group-focus-within/cam:translate-y-0 group-focus-within/cam:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100"}`}>
              <button type="button" onClick={togglePlay} aria-label={playing ? tr("Pause") : tr("Play")} className={iconBtn}>
                {playing ? <Pause size={18} aria-hidden="true" fill="currentColor" /> : <Play size={18} aria-hidden="true" fill="currentColor" />}
              </button>
              <button type="button" onClick={toggleMute} aria-label={muted ? tr("Unmute") : tr("Mute")} aria-pressed={muted} className={iconBtn}>
                {muted || volume === 0 ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
              </button>
              <input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))} aria-label={tr("Volume")} className="mx-1 hidden h-1 w-20 cursor-pointer accent-white sm:block" />
              {canFs && (
                <button type="button" onClick={toggleFs} aria-label={fs ? tr("Exit fullscreen") : tr("Fullscreen")} className={iconBtn}>
                  {fs ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Below the player: the camera's information. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <Info label={tr("Camera")}>
          <p className="text-base font-medium text-white">{tr(cameraName)}</p>
          <p className="text-sm text-white/55">{tr(city.name)}</p>
        </Info>
        <Info label={tr("Location")}>
          <p className="text-base font-medium text-white">{tr(location)}</p>
          <p className="text-sm text-white/55">
            {tr(city.region)} · {city.lat.toFixed(2)}°N {city.lon.toFixed(2)}°E
          </p>
        </Info>
        <Info label={tr("Stream source")}>
          <p className="text-base font-medium text-white">{cam.source}</p>
          <a href={cam.watchUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 rounded text-sm text-[#5db0ff] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            {tr("Watch on YouTube")}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </Info>
        <Info label={tr("Status")}>
          <p className="text-base font-medium text-white">{kind === "offline" && phase !== "error" ? tr("Not live right now") : statusText}</p>
          <p className="text-sm text-white/55">{checked ? `${checked.by} · ${shown(checked.at)} JST` : tr("No confirmation yet")}</p>
        </Info>
      </div>
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-white/45">{tr("This is a public YouTube live stream, shown in YouTube's own player. It is not a direct camera feed, and it is shown as live only when YouTube or the player confirms it is.")}</p>
    </section>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.18em] text-white/40">{label}</p>
      {children}
    </div>
  );
}
