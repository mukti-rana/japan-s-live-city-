import { useId } from "react";

// The Live City Japan logo: the same artwork as the browser-tab icon
// (src/app/icon.svg) — an anime-style pastel sunset, Mount Fuji, a red torii
// gate and sakura. Each copy on a page gets its own ids so several can sit
// side by side (or inside hidden parts of the page) without clashing.
export default function Logo({ size = 36 }: { size?: number }) {
  const id = useId();
  const u = (name: string) => `${id}-${name}`;
  const ref = (name: string) => `url(#${u(name)})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={u("sky")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f4fc0" />
          <stop offset="0.5" stopColor="#ff82b6" />
          <stop offset="1" stopColor="#ffcf92" />
        </linearGradient>
        <linearGradient id={u("sun")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6cf" />
          <stop offset="1" stopColor="#ffd37e" />
        </linearGradient>
        <clipPath id={u("round")}>
          <circle cx="32" cy="32" r="29.5" />
        </clipPath>
        <g id={u("blossom")}>
          <g fill="#fff0f6" stroke="#d94b86" strokeWidth="0.7">
            <circle cy="-2.1" r="1.7" />
            <circle cx="2" cy="-0.65" r="1.7" />
            <circle cx="1.25" cy="1.7" r="1.7" />
            <circle cx="-1.25" cy="1.7" r="1.7" />
            <circle cx="-2" cy="-0.65" r="1.7" />
          </g>
          <circle r="0.9" fill="#ff5c9a" />
        </g>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#1d1a4d" />
      <g clipPath={ref("round")}>
        <rect width="64" height="64" fill={ref("sky")} />
        <circle cx="20" cy="25" r="11" fill={ref("sun")} stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
        <rect x="30" y="14" width="26" height="2.6" rx="1.3" fill="#fff" fillOpacity="0.7" />
        <rect x="36" y="19" width="22" height="2.2" rx="1.1" fill="#fff" fillOpacity="0.5" />
        <rect x="4" y="41" width="22" height="2.2" rx="1.1" fill="#fff" fillOpacity="0.45" />
        <path d="M12 52 L30 20 Q35 11 40 20 L60 52 Z" fill="#8c92f0" stroke="#1d1a4d" strokeWidth="2" strokeLinejoin="round" />
        <path d="M35 14.2 Q38 15 40 20 L60 52 L40 52 L33 33 Z" fill="#5560c8" />
        <path d="M30 20 Q35 11 40 20 L37.8 22.4 L35.4 19.6 L33 23 L31.6 21.4 Z" fill="#fff" stroke="#1d1a4d" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M0 50 Q16 46 32 50 T64 49 L64 64 L0 64 Z" fill="#3a2a78" stroke="#1d1a4d" strokeWidth="1.5" />
        <g stroke="#1d1a4d" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <rect x="21.5" y="38" width="3.6" height="19" fill="#e8344f" />
          <rect x="38.9" y="38" width="3.6" height="19" fill="#e8344f" />
          <rect x="23" y="43.5" width="18" height="3" fill="#e8344f" />
          <path d="M16 37.5 Q32 41 48 37.5 L47 34.2 Q32 37.4 17 34.2 Z" fill="#ff4d66" />
        </g>
        <use href={`#${u("blossom")}`} transform="translate(11 11) rotate(15)" />
        <use href={`#${u("blossom")}`} transform="translate(53 33) rotate(-10) scale(0.85)" />
        <use href={`#${u("blossom")}`} transform="translate(9 56) rotate(30) scale(0.75)" />
        <path d="M49 8 L50.2 11.8 L54 13 L50.2 14.2 L49 18 L47.8 14.2 L44 13 L47.8 11.8 Z" fill="#fff" />
      </g>
      <circle cx="32" cy="32" r="30.4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="31.4" fill="none" stroke="#1d1a4d" strokeWidth="1.2" />
    </svg>
  );
}
