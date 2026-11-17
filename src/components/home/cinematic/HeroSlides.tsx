"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useReducedMotion } from "motion/react";
import type { HomePhoto } from "@/lib/data/homePhotos";

const BLUR = "blur" as const;

// How long each photograph stays, and how long the crossfade between two takes.
const HOLD_MS = 8500;
const FADE_MS = 1600;

// One photograph in the stack. It fades in only once it has really loaded, so a slow
// picture never shows as a blank frame, and a hidden slide is invisible to screen readers.
function Slide({ photo, visible, first, onReady, onFail }: { photo: HomePhoto; visible: boolean; first: boolean; onReady: (src: string) => void; onFail: (src: string) => void }) {
  const img = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);

  const done = useCallback(() => {
    setReady(true);
    onReady(photo.src);
  }, [onReady, photo.src]);

  // A cached picture can finish loading before React is listening for it.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) done();
  }, [done]);

  return (
    <div aria-hidden={visible ? undefined : true} className={`absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none ${visible && ready ? "opacity-100" : "opacity-0"}`} style={{ transitionDuration: `${first ? 700 : FADE_MS}ms` }}>
      <div className={`absolute inset-0 home-zoom ${photo.whole ? "home-zoom--whole lg:bg-black" : ""}`}>
        <Image
          ref={img}
          src={photo.src}
          alt={visible ? photo.alt : ""}
          fill
          preload={first}
          loading={first ? undefined : "eager"}
          sizes="100vw"
          placeholder={BLUR}
          blurDataURL={photo.blur}
          onLoad={done}
          onError={() => onFail(photo.src)}
          style={{ "--focus": photo.focus ?? "50% 50%", "--focus-lg": photo.deskFocus ?? "50% 50%" } as CSSProperties}
          className={`object-cover object-[var(--focus)] ${photo.whole ? "lg:object-contain" : ""} lg:object-[var(--focus-lg)]`}
        />
      </div>
    </div>
  );
}

// The hero's photographs: the detected city's own pictures, one after another with a slow
// crossfade. Rules it keeps:
//  - the first picture appears at once; the next one only starts loading a moment after,
//    so the slideshow never competes with the first paint;
//  - it only turns over when the next picture is ready, never to a blank frame;
//  - it holds still while the tab is hidden, the hero is off screen, or the visitor has
//    paused it, and never moves at all under reduced motion (a single still photograph);
//  - when the city changes, the new city's first picture crossfades over the old one;
//  - a picture that fails to load is skipped; with none left, the hero's gradient shows.
export default function HeroSlides({ photos, paused, onShow }: { photos: readonly HomePhoto[]; paused: boolean; onShow?: (photo: HomePhoto) => void }) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<HomePhoto | null>(null);
  const [armed, setArmed] = useState(false);
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const shown = useRef<HomePhoto | null>(null);

  const list = useMemo(() => photos.filter((p) => !failed.has(p.src)), [photos, failed]);
  const n = list.length;
  const current = n > 0 ? list[index % n] : undefined;
  const next = n > 1 ? list[(index + 1) % n] : undefined;
  const setKey = useMemo(() => photos.map((p) => p.src).join("|"), [photos]);

  const onReady = useCallback((src: string) => setLoaded((s) => (s.has(src) ? s : new Set(s).add(src))), []);
  const onFail = useCallback((src: string) => setFailed((s) => (s.has(src) ? s : new Set(s).add(src))), []);

  // A different city: start its photographs from the first, fading over whatever is showing.
  const lastKey = useRef(setKey);
  useEffect(() => {
    if (lastKey.current === setKey) return;
    lastKey.current = setKey;
    setLeaving(shown.current);
    setIndex(0);
    setArmed(false);
  }, [setKey]);

  // Tell the parent which picture is up, if it asks.
  useEffect(() => {
    if (!current) return;
    shown.current = current;
    onShow?.(current);
  }, [current, onShow]);

  // Let the next picture start loading a moment after the current one is on screen.
  useEffect(() => {
    if (armed || !current || !loaded.has(current.src)) return;
    const id = window.setTimeout(() => setArmed(true), 1500);
    return () => window.clearTimeout(id);
  }, [armed, current, loaded]);

  // Drop the picture that has faded out.
  useEffect(() => {
    if (!leaving || !current || !loaded.has(current.src)) return;
    const id = window.setTimeout(() => setLeaving(null), FADE_MS + 200);
    return () => window.clearTimeout(id);
  }, [leaving, current, loaded]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === "hidden");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The slideshow itself.
  useEffect(() => {
    if (n < 2 || reduce || paused || tabHidden || !inView || !current || !next || !loaded.has(next.src)) return;
    const id = window.setTimeout(() => {
      setLeaving(current);
      setIndex((i) => (i + 1) % n);
    }, HOLD_MS);
    return () => window.clearTimeout(id);
  }, [n, reduce, paused, tabHidden, inView, current, next, loaded]);

  if (!current) return null;

  const layers: { photo: HomePhoto; visible: boolean; first: boolean }[] = [];
  if (leaving && leaving.src !== current.src) layers.push({ photo: leaving, visible: true, first: false });
  layers.push({ photo: current, visible: true, first: index === 0 && !leaving && photos[0]?.src === current.src });
  if (next && armed && next.src !== current.src && next.src !== leaving?.src) layers.push({ photo: next, visible: false, first: false });

  return (
    <div ref={box} className="absolute inset-0">
      {layers.map((l) => (
        <Slide key={l.photo.src} photo={l.photo} visible={l.visible} first={l.first} onReady={onReady} onFail={onFail} />
      ))}
    </div>
  );
}
