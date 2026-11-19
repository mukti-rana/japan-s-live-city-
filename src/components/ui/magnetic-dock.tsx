"use client";

import { Fragment, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type Ref } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

// A macOS-style dock: icons swell and lift as the pointer nears them. Adapted from the
// @componentry/magnetic-dock registry item to this project's design system —
// dark-only tokens, glass over a scrim, and transform-only motion (the
// original animated width/height, which reflows the row on every frame).
//
// The look is a floating pane of black glass (a deep, see-through black tint over a strong blur, a hair-thin dark-grey edge, soft
// layered shadows) holding bare silver line icons with no boxes round them. Pointing at the dock swells the icons nearest the pointer
// with a smooth bell-shaped falloff, and each one also rises as it grows, so the icons come up out of the glass like a macOS dock; the
// icon under the pointer turns white and gets a faint glow, and a quiet label rises above it. The current page is shown by a white icon
// on a faint tile with a small light dot beneath: the only accent. Reduced motion turns the swelling and lifting off.

type DockPosition = "bottom" | "top" | "left" | "right";
type DockAccent = "azure" | "sakura" | "gold";

export interface DockItemData {
  id: string;
  /** Accessible name, also shown as the hover/focus label. */
  label: string;
  /** Icon element — a lucide-react icon sized 20px. */
  icon: ReactNode;
  /** Renders the item as a link. Without it the item is a button. */
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  badge?: number;
  /** Ignored: every icon is silver, and only the current page is accented. */
  accent?: DockAccent;
  /** The quiet colour (r, g, b) of the soft glow that rises behind this icon when it is pointed at. */
  glow?: [number, number, number];
  /** Draws a thin divider after this item, to set a group apart. */
  dividerAfter?: boolean;
}

export interface MagneticDockProps {
  items: DockItemData[];
  /** Accessible name for the dock's nav landmark. */
  label: string;
  /** Tile size in px. Keep at 44 or above — it is also the touch target. */
  iconSize?: number;
  /** Scale of the tile directly under the pointer. */
  maxScale?: number;
  /** How far, in px, the pointer's pull reaches. */
  magneticDistance?: number;
  showLabels?: boolean;
  /** Which screen edge the dock sits on; tiles grow away from it. */
  position?: DockPosition;
  className?: string;
}

// Icons are all silver now; the accent prop is kept so existing callers still type-check, and is ignored.

// Tiles grow away from the edge the dock is anchored to.
const ORIGIN: Record<DockPosition, string> = {
  bottom: "50% 100%",
  top: "50% 0%",
  left: "0% 50%",
  right: "100% 50%",
};

const SPRING = { damping: 22, stiffness: 260, mass: 0.55 };
const LABEL_GAP = 12;

function DockItem({
  item,
  pointer,
  iconSize,
  maxScale,
  magneticDistance,
  showLabels,
  position,
  reducedMotion,
}: {
  item: DockItemData;
  pointer: MotionValue<number>;
  iconSize: number;
  maxScale: number;
  magneticDistance: number;
  showLabels: boolean;
  position: DockPosition;
  reducedMotion: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const isVertical = position === "left" || position === "right";

  // Signed distance from the pointer to this tile's centre along the dock.
  const distance = useTransform(pointer, (value: number) => {
    if (!ref.current) return Infinity; // not measured yet: no swell (the server and the first client render agree)
    const rect = ref.current.getBoundingClientRect();
    const centre = isVertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    return value - centre;
  });
  // A smooth bell: the icon under the pointer grows most, its neighbours less, and the swelling dies away without a visible edge.
  const swell = useTransform(distance, (d: number) => {
    const sigma = magneticDistance * 0.5;
    return 1 + (maxScale - 1) * Math.exp(-(d * d) / (2 * sigma * sigma));
  });
  const scale = useSpring(swell, SPRING);
  // ...and it rises as it grows, up out of the glass.
  const lift = useTransform(scale, [1, maxScale], [0, -iconSize * 0.3]);

  // The label sits past the tile at full swell so it never overlaps it.
  const labelOffset = iconSize * (maxScale - 1) + LABEL_GAP;
  const labelStyle = {
    bottom: { bottom: `calc(100% + ${labelOffset}px)`, left: "50%", translate: "-50% 0" },
    top: { top: `calc(100% + ${labelOffset}px)`, left: "50%", translate: "-50% 0" },
    left: { left: `calc(100% + ${labelOffset}px)`, top: "50%", translate: "0 -50%" },
    right: { right: `calc(100% + ${labelOffset}px)`, top: "50%", translate: "0 -50%" },
  }[position];

  const className =
    "group relative flex shrink-0 items-center justify-center rounded-2xl focus:outline-none focus-visible:ring-1 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
  const handlers = {
    onPointerEnter: () => setHovered(true),
    onPointerLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
  const style = { width: iconSize, height: iconSize };

  const body = (
    <>
      <motion.span
        aria-hidden="true"
        style={{ scale: reducedMotion ? 1 : scale, y: reducedMotion ? 0 : lift, transformOrigin: ORIGIN[position] }}
        className={`relative flex h-full w-full items-center justify-center rounded-2xl transition-[color,background-color,filter] duration-300 ${
          item.isActive
            ? "bg-white/[0.09] text-white [filter:drop-shadow(0_0_8px_rgba(190,215,255,0.45))]"
            : "text-[var(--ic,#c9ccd4)] group-hover:text-[var(--ic-hot,#ffffff)] group-focus-visible:text-[var(--ic-hot,#ffffff)]"
        }`}
      >
        {/* On hover: a soft glow in the tool's own colour rises behind the icon. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ background: `radial-gradient(circle, rgba(${(item.glow ?? [190, 200, 255]).join(",")},0.9), transparent 72%)` }}
        />
        <span className="dock-glint relative transition-transform duration-150 group-active:scale-[0.86]">{item.icon}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-semibold text-black">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </motion.span>
      {/* The current page: a small light dot beneath the icon. */}
      <span aria-hidden="true" className={`pointer-events-none absolute -bottom-[7px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#bcd6ff] shadow-[0_0_8px_2px_rgba(160,200,255,0.55)] transition-[opacity,transform] duration-300 ${item.isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />

      {item.badge !== undefined && item.badge > 0 && (
        <span className="sr-only">({item.badge})</span>
      )}

      <AnimatePresence initial={false}>
        {showLabels && (hovered || focused) && (
          <motion.span
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={labelStyle}
            className="pointer-events-none absolute z-50 whitespace-nowrap rounded-xl border border-white/[0.12] bg-[#0a0a0c]/90 px-3 py-1.5 text-[12.5px] font-medium tracking-wide text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          >
            {item.label}
            <span aria-hidden="true" className="absolute left-1/2 top-full -mt-[3px] h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-b border-r border-white/[0.12] bg-[#0a0a0c]" />
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );

  if (item.href) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        href={item.href}
        onClick={item.onClick}
        aria-label={item.label}
        aria-current={item.isActive ? "page" : undefined}
        className={className}
        style={style}
        {...handlers}
      >
        {body}
      </a>
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      aria-pressed={item.isActive}
      className={className}
      style={style}
      {...handlers}
    >
      {body}
    </button>
  );
}

export function MagneticDock({
  items,
  label,
  iconSize = 46,
  maxScale = 1.6,
  magneticDistance = 130,
  showLabels = true,
  position = "bottom",
  className = "",
}: MagneticDockProps) {
  const pointer = useMotionValue(Infinity);
  const reducedMotion = useReducedMotion() ?? false;
  const isVertical = position === "left" || position === "right";
  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    // Touch has no hover, and a swelling tile under a finger shifts the target.
    if (event.pointerType === "touch") return;
    pointer.set(isVertical ? event.clientY : event.clientX);
  }

  return (
    <nav
      aria-label={label}
      onPointerMove={reducedMotion ? undefined : handlePointerMove}
      onPointerLeave={() => pointer.set(Infinity)}
      // Black glass: a deep, see-through black tint over a strong blur, a hair-thin dark-grey edge, and soft layered shadows that lift it off
      // the page. The blur keeps what is behind it from fighting with the icons.
      className={`inline-flex items-center gap-1.5 rounded-[1.4rem] border border-white/[0.08] bg-[rgba(6,6,8,0.58)] p-2 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.9),0_6px_18px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl backdrop-saturate-150 ${
        isVertical ? "flex-col" : "flex-row"
      } ${className}`}
    >
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <motion.span
            className="relative flex"
            style={{ "--i": String(index), "--gc": (item.glow ?? [190, 200, 255]).join(","), "--ic": `color-mix(in srgb, rgb(${(item.glow ?? [190, 200, 255]).join(",")}) 62%, #ffffff)`, "--ic-hot": `color-mix(in srgb, rgb(${(item.glow ?? [190, 200, 255]).join(",")}) 38%, #ffffff)` } as CSSProperties}
            initial={{ opacity: 0, y: 16, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.15 + index * 0.05, type: "spring", stiffness: 260, damping: 20 }}
          >
          <DockItem
            item={item}
            pointer={pointer}
            iconSize={iconSize}
            maxScale={maxScale}
            magneticDistance={magneticDistance}
            showLabels={showLabels}
            position={position}
            reducedMotion={reducedMotion}
          />
          </motion.span>
          {item.dividerAfter && <span aria-hidden="true" className={isVertical ? "my-1 h-px self-stretch bg-white/[0.1]" : "mx-1.5 h-6 w-px self-center bg-white/[0.1]"} />}
        </Fragment>
      ))}
    </nav>
  );
}
