// A thin border of travelling colour for a rounded card — the "shine
// border" effect. Put it as the first child of a `relative` card; it fills the
// card's edge and never covers its content or blocks clicks.
//
// How it works: a ring (the card's border box with its middle cut out by a
// mask) clips a much larger conic gradient. Only that gradient's rotation
// (transform) is animated, so it is cheap. It pauses when the tab is hidden
// (html[data-atm-paused]) and stands still for visitors who ask for less
// motion — the colours then simply stay where they are.
export default function ShineBorder({ colors = ["#a07cfe", "#fe8fb5", "#ffbe7b"], duration = 7, width = 2 }: { colors?: string[]; duration?: number; width?: number }) {
  // Two bright "comets" of colour, opposite each other, each fading out behind
  // it — so the eye can follow the light travelling round the edge. The rest of
  // the ring stays clear, leaving the card's own soft border showing.
  const [a, b, c] = [colors[0], colors[1 % colors.length], colors[2 % colors.length]];
  const comet = (from: number) => `transparent ${from}deg, ${a} ${from + 55}deg, ${b} ${from + 100}deg, ${c} ${from + 128}deg, transparent ${from + 150}deg`;
  const gradient = `conic-gradient(from 0deg, ${comet(0)}, transparent 180deg, ${comet(180)}, transparent 360deg)`;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [-webkit-mask-composite:xor] [mask-composite:exclude] [-webkit-mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask:linear-gradient(#000_0_0)_content-box_exclude,linear-gradient(#000_0_0)]"
      style={{ padding: width }}
    >
      <span className="shine-spin absolute left-1/2 top-1/2 block aspect-square w-[220%]" style={{ background: gradient, animationDuration: `${duration}s` }} />
    </span>
  );
}
