// The skeleton of the cherry trees in the sign-in picture, and a small physics simulation that bends it in the wind.
//
// The picture is one flat image, so the trees cannot be moved as layers. Instead each tree is given a skeleton traced over the picture
// (every branch is a chain of bones, each bone starting where its parent ends or at some point along it) and SceneCanvas deforms the
// picture's pixels with it: every pixel near a branch moves with that branch (a "skinned mesh", with the picture as the skin), so the
// blossom and leaves follow the wood they grow on.
//
// The bones are simulated, not animated by formula: each bone is a stiff spring that the wind pushes sideways. The wind is a
// breeze that never quite stops plus gusts that arrive now and then at random, sweep through the tree from the left, and die away,
// and the springs make the wood lean into a gust, overshoot a little and settle, the way a real branch does. A bone's rotation adds
// to its parent's, so a movement runs from the base of a branch out to its tips, growing as it goes: thick limbs are stiff and barely
// move; thin ones give; twigs swing most and a little late. Nothing is a loop: gusts come at random intervals and strengths.
//
// Positions are in picture pixels (1672 x 941) as traced; the simulation works in the picture's own proportions (x scaled by its
// aspect) so rotations stay round.

export const IMG_W = 1672;
export const IMG_H = 941;
export const IMG_ASPECT = IMG_W / IMG_H;

// Stiffness classes: how thick the wood is. w0 = the spring's natural speed (rad/s), susc = how hard the wind pushes it, damp = damping ratio.
const CLASS = [
  { w0: 7.5, susc: 0.1, damp: 0.5 }, // thick limb
  { w0: 4.8, susc: 0.5, damp: 0.38 }, // medium branch
  { w0: 3.3, susc: 1.1, damp: 0.3 }, // thin branch
  { w0: 2.4, susc: 1.9, damp: 0.22 }, // twig
] as const;

// name, parent (or null: fixed to the world), t = where along the parent it grows from (0 base .. 1 tip), start (only for roots), end, class, radius of influence (px).
type Def = { n: string; p: string | null; t?: number; b?: [number, number]; e: [number, number]; c: 0 | 1 | 2 | 3; r: number };
const DEFS: Def[] = [
  // The thick trunk at the top left
  { n: "k0", p: null, b: [92, 0], e: [66, 58], c: 0, r: 26 },
  { n: "k1", p: "k0", t: 1, e: [34, 124], c: 0, r: 26 },
  { n: "k2", p: "k1", t: 1, e: [0, 196], c: 0, r: 24 },
  // The lower thick limb, and the long drooping branch that continues it
  { n: "l0", p: null, b: [0, 226], e: [88, 194], c: 0, r: 22 },
  { n: "l1", p: "l0", t: 1, e: [178, 166], c: 0, r: 22 },
  { n: "l2", p: "l1", t: 1, e: [236, 158], c: 1, r: 28 },
  { n: "d0", p: "l2", t: 1, e: [300, 177], c: 1, r: 30 },
  { n: "d1", p: "d0", t: 1, e: [364, 203], c: 1, r: 32 },
  { n: "d2", p: "d1", t: 1, e: [430, 234], c: 2, r: 36 },
  { n: "d3", p: "d2", t: 1, e: [494, 260], c: 2, r: 38 },
  { n: "d4", p: "d3", t: 1, e: [556, 285], c: 2, r: 40 },
  { n: "d5", p: "d4", t: 1, e: [658, 302], c: 3, r: 44 },
  // Branch off the drooping one, running right
  { n: "n0", p: "d0", t: 0.55, e: [380, 185], c: 2, r: 30 },
  { n: "n1", p: "n0", t: 1, e: [440, 201], c: 2, r: 34 },
  { n: "n2", p: "n1", t: 1, e: [504, 203], c: 3, r: 38 },
  { n: "n3", p: "n2", t: 1, e: [604, 186], c: 3, r: 42 },
  // A twig hanging off the drooping branch
  { n: "s0", p: "d0", t: 0.3, e: [346, 227], c: 2, r: 32 },
  { n: "s1", p: "s0", t: 1, e: [392, 292], c: 3, r: 40 },
  // The upper limb that rises from the trunk
  { n: "u0", p: "k1", t: 0.6, e: [112, 100], c: 1, r: 28 },
  { n: "u1", p: "u0", t: 1, e: [215, 77], c: 1, r: 28 },
  { n: "u2", p: "u1", t: 1, e: [310, 32], c: 2, r: 34 },
  { n: "u3", p: "u2", t: 1, e: [348, 10], c: 3, r: 38 },
  // The long limb across the top right, with its drooping twig
  { n: "r0", p: "u1", t: 0.9, e: [380, 105], c: 1, r: 30 },
  { n: "r1", p: "r0", t: 1, e: [448, 79], c: 2, r: 32 },
  { n: "r2", p: "r1", t: 1, e: [512, 68], c: 2, r: 34 },
  { n: "r3", p: "r2", t: 1, e: [643, 72], c: 3, r: 40 },
  { n: "r4", p: "r3", t: 1, e: [792, 70], c: 3, r: 46 },
  { n: "w0", p: "r3", t: 0.35, e: [634, 110], c: 3, r: 38 },
  // The blossom trees along the shore: a trunk (stiff) and a crown that sways on it
  { n: "g0", p: null, b: [60, 612], e: [70, 520], c: 0, r: 46 },
  { n: "g0c", p: "g0", t: 1, e: [82, 400], c: 1, r: 96 },
  { n: "g1", p: null, b: [172, 604], e: [186, 522], c: 0, r: 46 },
  { n: "g1c", p: "g1", t: 1, e: [192, 430], c: 1, r: 90 },
  { n: "g2", p: null, b: [306, 606], e: [312, 546], c: 0, r: 40 },
  { n: "g2c", p: "g2", t: 1, e: [320, 474], c: 1, r: 84 },
  { n: "g3", p: null, b: [440, 606], e: [448, 562], c: 0, r: 36 },
  { n: "g3c", p: "g3", t: 1, e: [454, 512], c: 1, r: 70 },
];

export type Bone = { n: string; parent: number; t: number; bx: number; by: number; ex: number; ey: number; cls: 0 | 1 | 2 | 3; rad: number };

// In the aspect-corrected space (x multiplied by IMG_ASPECT, units of picture heights), so distances and rotations are true.
function build(): Bone[] {
  const idx = new Map<string, number>();
  const out: Bone[] = [];
  const k = (x: number, y: number): [number, number] => [(x / IMG_W) * IMG_ASPECT, y / IMG_H];
  for (const d of DEFS) {
    const parent = d.p === null ? -1 : (idx.get(d.p) ?? -1);
    let b: [number, number];
    if (parent < 0) b = k(d.b![0], d.b![1]);
    else {
      const pb = out[parent];
      const t = d.t ?? 1;
      b = [pb.bx + (pb.ex - pb.bx) * t, pb.by + (pb.ey - pb.by) * t];
    }
    const e = k(d.e[0], d.e[1]);
    idx.set(d.n, out.length);
    out.push({ n: d.n, parent, t: d.t ?? 1, bx: b[0], by: b[1], ex: e[0], ey: e[1], cls: d.c, rad: d.r / IMG_H });
  }
  return out;
}

export const BONES: Bone[] = build();
export const BONE_COUNT = BONES.length;

type Gust = { t0: number; amp: number; dur: number; ang: number };

// Small deterministic-looking noise from sines, so the simulation needs no random numbers per frame.
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

export class TreeSim {
  // Per bone: angle relative to its parent and angular velocity.
  theta = new Float32Array(BONE_COUNT);
  omega = new Float32Array(BONE_COUNT);
  // For the shader, per bone: baseDx, baseDy, cos(total angle), sin(total angle) — and how fast the bone's tip is moving.
  xf = new Float32Array(BONE_COUNT * 4);
  speed = new Float32Array(BONE_COUNT);
  private cumTheta = new Float32Array(BONE_COUNT);
  private baseX = new Float32Array(BONE_COUNT);
  private baseY = new Float32Array(BONE_COUNT);
  private gusts: Gust[] = [];
  private nextGust = 1.5 + Math.random() * 3;
  private last = -1;
  private phase = Array.from({ length: BONE_COUNT }, () => Math.random() * 100);
  // The most recent overall strength of the wind (for the petals and anything else that wants to follow it).
  strength = 0;

  constructor() {
    for (let i = 0; i < BONE_COUNT; i++) {
      this.xf[i * 4 + 2] = 1;
    }
  }

  // The wind at a point (aspect space) at time t, as a vector. A steady breeze that breathes, a turbulence that differs from place
  // to place, and the gusts, which sweep from the left across the tree.
  wind(x: number, y: number, t: number): [number, number] {
    const breeze = 0.1 + 0.05 * Math.sin(t * 0.37) + 0.035 * Math.sin(t * 0.91 + 1.3);
    let g = 0;
    for (const gu of this.gusts) {
      const along = x / 0.9; // 0 at the left edge, ~1 across the tree
      const local = t - gu.t0 - along * 1.6;
      if (local < 0 || local > gu.dur) continue;
      const rise = Math.min(1, local / 0.9);
      const fall = Math.pow(1 - local / gu.dur, 1.6);
      g += gu.amp * rise * rise * (3 - 2 * rise) * fall;
    }
    const m = breeze + g;
    const swirl = Math.sin(t * 1.3 + x * 9 + y * 5) * 0.55 + Math.sin(t * 2.1 + x * 4 - y * 7) * 0.3;
    const ang = 0.12 + 0.25 * swirl * (0.4 + g * 1.6);
    return [Math.cos(ang) * m, Math.sin(ang) * m];
  }

  // Advance to time t (seconds). Safe to call several times with the same t.
  step(t: number) {
    if (t === this.last) return;
    let dt = this.last < 0 ? 1 / 60 : t - this.last;
    this.last = t;
    dt = Math.min(dt, 1 / 20); // after a pause, do not leap
    if (t >= this.nextGust) {
      this.gusts.push({ t0: t, amp: 0.55 + Math.random() * 0.75, dur: 3.2 + Math.random() * 2.4, ang: 0 });
      this.nextGust = t + 4.5 + Math.random() * 7.5;
    }
    this.gusts = this.gusts.filter((g) => t - g.t0 < g.dur + 3);
    let strengthSum = 0;
    for (let i = 0; i < BONE_COUNT; i++) {
      const b = BONES[i];
      const cl = CLASS[b.cls];
      const parentTheta = b.parent >= 0 ? this.cumTheta[b.parent] : 0;
      // The bone's current direction, with everything below it already bent.
      const cx = Math.cos(parentTheta + this.theta[i]);
      const sx = Math.sin(parentTheta + this.theta[i]);
      const dx0 = b.ex - b.bx;
      const dy0 = b.ey - b.by;
      const len = Math.hypot(dx0, dy0) || 1e-6;
      const dx = (dx0 * cx - dy0 * sx) / len;
      const dy = (dx0 * sx + dy0 * cx) / len;
      const mx = (b.bx + b.ex) / 2;
      const my = (b.by + b.ey) / 2;
      const [wx, wy] = this.wind(mx, my, t);
      strengthSum += Math.hypot(wx, wy);
      // Wind across the bone bends it; some of it is local turbulence that differs from bone to bone.
      const across = wx * -dy + wy * dx + 0.06 * Math.sin(t * (0.9 + (i % 7) * 0.23) + this.phase[i]);
      const torque = cl.susc * across * (0.7 + len * 2.2) * 0.9;
      const w0 = cl.w0;
      const acc = torque * w0 * w0 * 0.07 - w0 * w0 * this.theta[i] - 2 * cl.damp * w0 * this.omega[i];
      this.omega[i] += acc * dt;
      this.theta[i] += this.omega[i] * dt;
      if (this.theta[i] > 0.3) this.theta[i] = 0.3;
      else if (this.theta[i] < -0.3) this.theta[i] = -0.3;
      this.cumTheta[i] = parentTheta + this.theta[i];
    }
    this.strength = strengthSum / BONE_COUNT;
    // Forward kinematics: where each bone's base has been carried by the bending below it.
    for (let i = 0; i < BONE_COUNT; i++) {
      const b = BONES[i];
      let bx = b.bx;
      let by = b.by;
      if (b.parent >= 0) {
        const p = BONES[b.parent];
        const th = this.cumTheta[b.parent];
        const c = Math.cos(th);
        const s = Math.sin(th);
        const rx = b.bx - p.bx;
        const ry = b.by - p.by;
        bx = this.baseX[b.parent] + rx * c - ry * s;
        by = this.baseY[b.parent] + rx * s + ry * c;
      }
      this.baseX[i] = bx;
      this.baseY[i] = by;
      const th = this.cumTheta[i];
      this.xf[i * 4] = bx - b.bx;
      this.xf[i * 4 + 1] = by - b.by;
      this.xf[i * 4 + 2] = Math.cos(th);
      this.xf[i * 4 + 3] = Math.sin(th);
      const lever = Math.hypot(b.ex - b.bx, b.ey - b.by);
      this.speed[i] = Math.abs(this.omega[i]) * lever + (b.parent >= 0 ? this.speed[b.parent] * 0.6 : 0);
    }
  }

  // Where a bone's tip is now (aspect space), for things that come off the branches.
  tip(i: number): [number, number] {
    const b = BONES[i];
    const th = this.cumTheta[i];
    const c = Math.cos(th);
    const s = Math.sin(th);
    const rx = b.ex - b.bx;
    const ry = b.ey - b.by;
    return [this.baseX[i] + rx * c - ry * s, this.baseY[i] + rx * s + ry * c];
  }
}

// One simulation shared by the picture's shader and the petals, so the petals are lifted by the same gusts that bend the branches.
let shared: TreeSim | null = null;
export function sharedSim() {
  if (!shared) shared = new TreeSim();
  return shared;
}
export { hash };
