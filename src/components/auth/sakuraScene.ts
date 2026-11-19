// Where things stand in the sign-in scenery, shared by the trees on the page (SceneLife) and their reflection in the lake
// (WaterCanvas). All positions are fractions of the photograph: x across its width, y down its height.

export const WATER = 0.535; // the waterline
export const PHOTO_ASPECT = 1600 / 1066;
// A hillside tree's picture is 900 x 700 (a trunk foot at the bottom centre), so it is this tall for its width.
export const TREE_ASPECT = 700 / 900;

export type Variant = "a" | "b" | "c";
export type Tree = { v: Variant; x: number; y: number; w: number; flip?: boolean; back?: boolean; dur: number; delay: number; amp: number };

// The foot of each trunk is at (x, y); w is the crown's width as a fraction of the photograph's width. Mostly on the left, on the
// wooded hill; the smaller, hazier ones stand further up the slope.
export const TREES: Tree[] = [
  { v: "c", x: 0.1, y: 0.462, w: 0.13, flip: true, back: true, dur: 9.4, delay: -2, amp: 0.9 },
  { v: "b", x: 0.21, y: 0.488, w: 0.11, back: true, dur: 8.6, delay: -5, amp: 1 },
  { v: "a", x: 0.045, y: 0.505, w: 0.21, dur: 8.2, delay: -1, amp: 1 },
  { v: "b", x: 0.15, y: 0.525, w: 0.18, flip: true, dur: 7.4, delay: -4, amp: 1.1 },
  { v: "c", x: 0.245, y: 0.535, w: 0.15, dur: 8.8, delay: -6, amp: 1.2 },
  { v: "a", x: 0.32, y: 0.535, w: 0.115, flip: true, dur: 7.8, delay: -3, amp: 1.3 },
  { v: "b", x: 0.37, y: 0.535, w: 0.085, dur: 8.3, delay: -7, amp: 1.4 },
];

export const treeSrc = (t: Tree, layer: "wood" | "bloom") => `/images/sakura/sakura-tree-${t.v}-${layer}.webp`;
