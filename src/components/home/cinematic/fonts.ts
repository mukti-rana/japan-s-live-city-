import { Noto_Serif_JP, Playfair_Display } from "next/font/google";

// Loaded here, not in the root layout, so only the homepage ever downloads them.
// Playfair Display carries the chapter headings and the hero line (Latin only).
// Noto Serif JP is used for a handful of large display kanji (東京, 京都…); it is not
// preloaded, so the browser fetches only the few glyph slices that are on screen.
export const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-home-serif",
  display: "swap",
});

export const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-home-kanji",
  display: "swap",
  preload: false,
});

export const homeFontVars = `${playfair.variable} ${notoSerifJp.variable}`;
