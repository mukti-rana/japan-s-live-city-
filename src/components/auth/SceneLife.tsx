import type { CSSProperties } from "react";
import { TREES, treeSrc, TREE_ASPECT, type Tree } from "@/components/auth/sakuraScene";

// The cherry trees of the sign-in scenery, standing on the wooded hill at the left. Rendered inside `.auth-scene` (see
// FujiBackdrop), a box that is the photograph's own size and position, so a fraction of it always lands on the same spot of
// the picture. Each tree is two pictures (public/images/sakura/, drawn by scripts/render-sakura-trees.mjs): the WOOD (trunk,
// limbs, twigs) and the BLOOM (the flowers). They sway about the foot of the trunk on slightly different beats, so the flowers
// flutter on the wood the way they do in a breeze. Only transform animates; it stops while the tab is hidden and stands still
// for visitors who ask for less motion (see globals.css, "Sign-in scenery"). Their reflection in the lake is drawn by WaterCanvas.

function TreeImg({ t }: { t: Tree }) {
  const style = { left: `${t.x * 100}%`, top: `${t.y * 100}%`, width: `${t.w * 100}%`, aspectRatio: `1 / ${TREE_ASPECT}`, scale: t.flip ? "-1 1" : undefined, opacity: t.back ? 0.86 : undefined } as CSSProperties;
  const beat = { animationDuration: `${t.dur}s`, animationDelay: `${t.delay}s`, "--amp": t.amp } as CSSProperties;
  return (
    <div className="auth-tree" style={style}>
      <div className="auth-tree__sway" style={beat}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={treeSrc(t, "wood")} alt="" draggable={false} decoding="async" className="auth-tree__img" />
        <div className="auth-tree__bloom" style={{ animationDuration: `${t.dur * 0.71}s`, animationDelay: `${t.delay * 0.6}s`, "--amp": t.amp } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={treeSrc(t, "bloom")} alt="" draggable={false} decoding="async" className="auth-tree__img" />
        </div>
      </div>
    </div>
  );
}

export default function SceneLife() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      {TREES.map((t, i) => (
        <TreeImg key={i} t={t} />
      ))}
    </div>
  );
}
