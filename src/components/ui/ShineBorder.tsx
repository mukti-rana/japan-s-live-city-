// A thin border of slowly travelling colour for a rounded card — the "shine
// border" effect. Put it as the first child of a `relative` card; it fills the
// card's edge and never covers its content or blocks clicks.
//
// How it works: a ring (the card's border box with its middle cut out by a
// mask) clips a much larger conic gradient. Only that gradient's rotation
// (transform) is animated, so it is cheap. It pauses when the tab is hidden
// (html[data-atm-paused]) and stands still for visitors who ask for less
// motion — the colours then simply stay where they are.
export default function ShineBorder({ colors = ["#a07cfe", "#fe8fb5", "#ffbe7b"], duration = 14, width = 2 }: { colors?: string[]; duration?: number; width?: number }) {
  const stops = [...colors, colors[0]].join(", ");
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [-webkit-mask-composite:xor] [mask-composite:exclude] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
      style={{ padding: width }}
    >
      <span
        className="shine-spin absolute left-1/2 top-1/2 block aspect-square w-[220%] opacity-95"
        style={{ background: `conic-gradient(from 0deg, ${stops})`, animationDuration: `${duration}s` }}
      />
    </span>
  );
}
