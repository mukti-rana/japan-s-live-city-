"use client";

import { useRef, useState, type PointerEvent, type ReactNode, type Ref } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

// A macOS-style dock: icons swell as the pointer nears them. Adapted from the
// @componentry/magnetic-dock registry item to this project's design system —
// dark-only tokens, glass over a scrim, and transform-only motion (the
// original animated width/height, which reflows the row on every frame).

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
  /** Icon tint. Defaults to plain foreground. */
  accent?: DockAccent;
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

const ACCENT_CLASS: Record<DockAccent, string> = {
  azure: "text-azure",
  sakura: "text-sakura",
  gold: "text-gold",
};

// Tiles grow away from the edge the dock is anchored to.
const ORIGIN: Record<DockPosition, string> = {
  bottom: "50% 100%",
  top: "50% 0%",
  left: "0% 50%",
  right: "100% 50%",
};

const SPRING = { damping: 20, stiffness: 300, mass: 0.5 };
const LABEL_GAP = 8;

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
    if (!ref.current) return magneticDistance + 1;
    const rect = ref.current.getBoundingClientRect();
    const centre = isVertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
    return value - centre;
  });
  const scale = useSpring(
    useTransform(distance, [-magneticDistance, 0, magneticDistance], [1, maxScale, 1]),
    SPRING,
  );

  // The label sits past the tile at full swell so it never overlaps it.
  const labelOffset = iconSize * (maxScale - 1) + LABEL_GAP;
  const labelStyle = {
    bottom: { bottom: `calc(100% + ${labelOffset}px)`, left: "50%", translate: "-50% 0" },
    top: { top: `calc(100% + ${labelOffset}px)`, left: "50%", translate: "-50% 0" },
    left: { left: `calc(100% + ${labelOffset}px)`, top: "50%", translate: "0 -50%" },
    right: { right: `calc(100% + ${labelOffset}px)`, top: "50%", translate: "0 -50%" },
  }[position];

  const className =
    "group relative flex shrink-0 items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-panel";
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
        style={{ scale: reducedMotion ? 1 : scale, transformOrigin: ORIGIN[position] }}
        className={`flex h-full w-full items-center justify-center rounded-xl border transition-colors duration-200 ${
          item.isActive
            ? "border-sakura/40 bg-sakura/20 text-sakura"
            : `border-glass-border bg-glass-bg-strong group-hover:border-azure/30 ${
                item.accent ? ACCENT_CLASS[item.accent] : "text-foreground"
              }`
        }`}
      >
        {item.icon}
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sakura px-1.5 text-xs font-semibold text-background">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </motion.span>

      {item.badge !== undefined && item.badge > 0 && (
        <span className="sr-only">({item.badge})</span>
      )}

      <AnimatePresence initial={false}>
        {showLabels && (hovered || focused) && (
          <motion.span
            aria-hidden="true"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={labelStyle}
            className="pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-glass-border bg-panel px-2.5 py-1 text-xs font-medium text-foreground shadow-lg shadow-black/40"
          >
            {item.label}
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
  iconSize = 48,
  maxScale = 1.3,
  magneticDistance = 120,
  showLabels = true,
  position = "bottom",
  className = "",
}: MagneticDockProps) {
  const pointer = useMotionValue(Infinity);
  const reducedMotion = useReducedMotion() ?? false;
  const isVertical = position === "left" || position === "right";

  function handlePointerMove(event: PointerEvent) {
    // Touch has no hover, and a swelling tile under a finger shifts the target.
    if (event.pointerType === "touch") return;
    pointer.set(isVertical ? event.clientY : event.clientX);
  }

  return (
    <nav
      aria-label={label}
      onPointerMove={reducedMotion ? undefined : handlePointerMove}
      onPointerLeave={() => pointer.set(Infinity)}
      // panel/85 is the project's scrim for glass over non-uniform backdrops.
      className={`inline-flex gap-3 rounded-2xl border border-glass-border bg-panel/85 p-2 shadow-lg shadow-black/40 backdrop-blur-xl ${
        isVertical ? "flex-col" : "flex-row"
      } ${className}`}
    >
      {items.map((item) => (
        <DockItem
          key={item.id}
          item={item}
          pointer={pointer}
          iconSize={iconSize}
          maxScale={maxScale}
          magneticDistance={magneticDistance}
          showLabels={showLabels}
          position={position}
          reducedMotion={reducedMotion}
        />
      ))}
    </nav>
  );
}
