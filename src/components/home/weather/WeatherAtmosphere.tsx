import type { WeatherIconKind } from "@/lib/services/weather";

// A lightweight, CSS-only sky behind the weather card's city and temperature.
// It follows the real condition and day/night — soft sunlight, layered clouds,
// fine rain, light snowfall, a moonlit sky — and sits under a dark overlay so
// the text on top stays readable. Positions are fixed (not random) so the
// server and browser render the same thing.

const SKY: Record<WeatherIconKind, { day: string; night: string }> = {
  clear: { day: "from-[#1d4f9c] via-[#17366f] to-[#0d1736]", night: "from-[#101a3d] via-[#0c1330] to-[#080c20]" },
  partly: { day: "from-[#23487f] via-[#192f5f] to-[#0e1735]", night: "from-[#121a3b] via-[#0d1431] to-[#080c20]" },
  cloud: { day: "from-[#2b3a5c] via-[#1d2947] to-[#0f1630]", night: "from-[#151c36] via-[#0e1530] to-[#080c20]" },
  fog: { day: "from-[#37445f] via-[#252f4a] to-[#121935]", night: "from-[#1a2038] via-[#111833] to-[#080c20]" },
  drizzle: { day: "from-[#233a63] via-[#18284b] to-[#0d1432]", night: "from-[#101831] via-[#0c122b] to-[#070b1d]" },
  rain: { day: "from-[#1c2f55] via-[#14213f] to-[#0b1128]", night: "from-[#0f1730] via-[#0a102a] to-[#060a1b]" },
  snow: { day: "from-[#30476f] via-[#212f55] to-[#10183a]", night: "from-[#161f3e] via-[#0e1633] to-[#080c20]" },
  storm: { day: "from-[#241f4a] via-[#181a3d] to-[#0b0f28]", night: "from-[#171338] via-[#0e1030] to-[#070a1d]" },
};

const STARS = [
  { x: 8, y: 12, d: 0 }, { x: 22, y: 26, d: 1.2 }, { x: 36, y: 9, d: 2.1 }, { x: 47, y: 30, d: 0.6 },
  { x: 58, y: 14, d: 1.7 }, { x: 70, y: 36, d: 2.6 }, { x: 14, y: 42, d: 3.1 }, { x: 82, y: 22, d: 0.9 },
  { x: 90, y: 10, d: 2.3 }, { x: 64, y: 6, d: 1.4 },
];

const RAIN_X = [4, 11, 17, 24, 31, 38, 45, 52, 58, 65, 72, 79, 86, 93];
const SNOW_X = [5, 13, 20, 28, 35, 43, 51, 59, 66, 74, 81, 89, 96];

const CLOUD_BASE = "absolute rounded-full blur-2xl wx-drift";

function Clouds({ dark, strong }: { dark?: boolean; strong?: boolean }) {
  const tone = dark ? "bg-slate-300/15" : strong ? "bg-slate-200/25" : "bg-slate-100/20";
  const tone2 = dark ? "bg-slate-400/10" : strong ? "bg-slate-200/15" : "bg-slate-100/10";
  return (
    <>
      <span className={`${CLOUD_BASE} ${tone} left-[8%] top-[10%] h-24 w-[46%]`} style={{ animationDuration: "30s" }} />
      <span className={`${CLOUD_BASE} ${tone2} left-[40%] top-[26%] h-20 w-[52%]`} style={{ animationDuration: "38s", animationDelay: "-9s" }} />
      <span className={`${CLOUD_BASE} ${tone} -left-[6%] top-[44%] h-20 w-[40%]`} style={{ animationDuration: "34s", animationDelay: "-15s" }} />
    </>
  );
}

export default function WeatherAtmosphere({ icon, isNight }: { icon: WeatherIconKind; isNight: boolean }) {
  const sky = SKY[icon][isNight ? "night" : "day"];
  const showStars = isNight && (icon === "clear" || icon === "partly" || icon === "snow");
  const rainy = icon === "rain" || icon === "storm" || icon === "drizzle";

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-br ${sky}`}>
      {/* Light source: soft sun by day, a small moon by night. */}
      {(icon === "clear" || icon === "partly") &&
        (isNight ? (
          <span className="absolute right-[12%] top-[14%] h-12 w-12 rounded-full shadow-[inset_-9px_5px_0_0_#e9e6f5,0_0_50px_10px_rgba(150,165,255,0.16)] sm:h-14 sm:w-14" />
        ) : (
          <span className="absolute -right-[4%] -top-[18%] h-[60%] w-[46%] rounded-full bg-[radial-gradient(circle,rgba(255,214,140,0.55)_0%,rgba(255,190,110,0.18)_45%,transparent_70%)]" />
        ))}

      {showStars &&
        STARS.map((s) => (
          <span
            key={s.x}
            className="wx-twinkle absolute h-[3px] w-[3px] rounded-full bg-white"
            style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.d}s` }}
          />
        ))}

      {icon === "partly" && <Clouds />}
      {icon === "cloud" && <Clouds strong />}
      {icon === "fog" && (
        <>
          <Clouds strong />
          <span className="absolute inset-x-0 bottom-[18%] h-16 bg-gradient-to-t from-white/15 to-transparent blur-xl" />
        </>
      )}
      {(rainy || icon === "snow") && <Clouds dark />}

      {rainy &&
        RAIN_X.map((x, i) => (
          <span
            key={x}
            className="wx-rain absolute top-0 h-10 w-px bg-gradient-to-b from-transparent to-sky-200/70"
            style={{
              left: `${x}%`,
              animationDelay: `${(i % 7) * 0.24}s`,
              animationDuration: icon === "drizzle" ? "2.3s" : "1.6s",
            }}
          />
        ))}

      {icon === "snow" &&
        SNOW_X.map((x, i) => (
          <span
            key={x}
            className="wx-snow absolute top-0 h-1 w-1 rounded-full bg-white/90"
            style={{ left: `${x}%`, animationDelay: `${(i % 6) * 1.1}s`, animationDuration: `${6 + (i % 4)}s` }}
          />
        ))}

      {/* Quiet city skyline along the bottom edge. */}
      <svg
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[22%] w-full text-[#070b1a]"
      >
        <path
          fill="currentColor"
          fillOpacity="0.72"
          d="M0 60V38h14V26h12v12h10V30h8V14h8v16h10V34h14V22h10v-8h6v8h8v14h12V30h16V18h10v12h12V36h14V24h8V10h10v14h8v10h14V28h12V16h10v12h16V38h12V26h10v12h14V32h10V20h8v12h12v8h14V30h12V22h8v8h12V36h14V28h10v10h12V34h14v26Z"
        />
      </svg>

      {/* Legibility: darken toward the text and the bottom edge. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/70 via-[#070b1a]/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b1a]/55 via-transparent to-transparent" />
    </div>
  );
}
