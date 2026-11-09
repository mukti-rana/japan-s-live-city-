// A cherry-blossom branch growing in from a corner of the sign-in page.
//
// The branch is a small transparent picture (public/images/sakura/, made by
// scripts/render-sakura.mjs) rather than hundreds of live shapes, so it costs
// one light image and no layout work. It fades in as the page opens and then
// sways very slightly. Purely decorative: hidden from assistive technology
// and never takes clicks.
//
// Used inside `.atm-anim`: the sway stops when the tab is hidden, and for
// visitors who ask for less motion the branch simply stays where it is.
//
// The picture has a small margin around the branch so no blossom is cut off;
// `className` positions and sizes the branch itself (its 400-unit box), and
// the image is enlarged and pulled back by that margin (24 of 400 units).

type Branch = "large" | "small";

export default function SakuraBranches({ className, branch = "large", delay = 0 }: { className?: string; branch?: Branch; delay?: number }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute select-none ${className ?? ""}`}>
      <div className="sakura-sway origin-top-left" style={{ animationDelay: `${delay}s` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/sakura/branch-${branch}.webp`}
          alt=""
          draggable={false}
          decoding="async"
          className="sakura-in -ml-[6%] -mt-[6%] block h-auto w-[112%] max-w-none origin-top-left"
          style={{ animationDelay: `${delay}s` }}
        />
      </div>
    </div>
  );
}
