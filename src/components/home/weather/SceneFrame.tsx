"use client";

import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

// The weather card as a window with depth. With a mouse (never touch), the whole pane tilts a few degrees toward the pointer, the sky
// behind drifts a little with it, the writing in front drifts the other way, and a faint light slides over the glass, so the sky feels
// further away than the words. It is all CSS driven by four variables set here (--px, --py from -1 to 1, --hv for hover), eased by
// the CSS transitions, so there is no per-frame script; it stands still for visitors who ask for less motion (see .wx-scene in globals.css).
export default function SceneFrame({ className = "", children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)).toFixed(3)));
    el.style.setProperty("--py", String(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)).toFixed(3)));
    el.style.setProperty("--hv", "1");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
    el.style.setProperty("--hv", "0");
  };
  return (
    <section ref={ref} onPointerMove={move} onPointerLeave={leave} className={`wx-scene ${className}`} style={{ "--px": 0, "--py": 0, "--hv": 0 } as CSSProperties}>
      {children}
      <span aria-hidden="true" className="wx-glare pointer-events-none absolute inset-0" />
    </section>
  );
}
