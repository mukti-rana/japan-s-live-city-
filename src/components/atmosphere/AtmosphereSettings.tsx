"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import Scene from "@/components/atmosphere/Scene";
import { useAtmospherePrefs } from "@/lib/atmosphere/AtmosphereContext";
import { INTENSITIES, MODES, resolveAtmosphere, type AtmosphereMode, type AtmospherePrefs, type Art, type Intensity } from "@/lib/atmosphere/resolve";
import { useAuth } from "@/lib/supabase/AuthContext";
import { useTranslate } from "@/lib/i18n/inline";

const MODE_LABEL: Record<AtmosphereMode, string> = {
  auto: "Auto (weather and season)",
  sakura: "Sakura Spring",
  neon: "Tokyo Neon Night",
  autumn: "Kyoto Autumn",
  fuji: "Mount Fuji Winter",
  matsuri: "Summer Matsuri",
  off: "Minimal / Off",
};
const INTENSITY_LABEL: Record<Intensity, string> = { low: "Low", medium: "Medium", off: "Off" };

function jstMonth(): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", month: "numeric" }).format(new Date()));
}

// Settings → Appearance → Background Atmosphere. Choices are previewed live
// and only take effect when applied; guests keep them on this device and
// signed-in visitors on their account.
export default function AtmosphereSettings() {
  const tr = useTranslate();
  const { user, configured } = useAuth();
  const { prefs, setPrefs } = useAtmospherePrefs();
  const [draft, setDraft] = useState<AtmospherePrefs | null>(null);
  const [month] = useState(jstMonth);
  const shown = draft ?? prefs;
  const dirty = draft !== null && (draft.mode !== prefs.mode || draft.intensity !== prefs.intensity);

  // The preview is drawn as the Home page would be: Auto shows the current
  // season (real weather adds rain or snow on the page itself).
  const r = resolveAtmosphere({ prefs: shown, pathname: "/", month, hour: 21, weather: null });

  const thumb = (mode: AtmosphereMode) => {
    const t = resolveAtmosphere({ prefs: { mode, intensity: "off" }, pathname: "/", month, hour: 21, weather: null });
    return t.art ? <Scene art={t.art as Art} particle={null} weather={null} fireworks={false} animate={false} density={0} veil={0.12} /> : null;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={tr("Background atmosphere")}>
        {MODES.map((m) => {
          const on = shown.mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setDraft({ ...shown, mode: m })}
              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/60 ring-1 ring-azure/40" : "border-glass-border hover:border-white/25"}`}
            >
              <span className="relative block h-16 w-full bg-glass-bg-strong">
                {thumb(m) ?? <span className="flex h-full items-center justify-center text-[10px] text-muted">{tr("Plain background")}</span>}
              </span>
              <span className="flex items-center justify-between gap-1 px-2.5 py-2 text-[11px] font-medium text-foreground">
                {tr(MODE_LABEL[m])}
                {on && <Check size={12} className="shrink-0 text-azure" aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="text-xs font-semibold text-foreground">{tr("Animation intensity")}</p>
        <div role="radiogroup" aria-label={tr("Animation intensity")} className="mt-2 inline-flex rounded-xl border border-glass-border bg-glass-bg p-1">
          {INTENSITIES.map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={shown.intensity === i}
              onClick={() => setDraft({ ...shown, intensity: i })}
              className={`min-h-9 rounded-lg px-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${shown.intensity === i ? "bg-gradient-to-r from-azure/25 to-neon-purple/25 text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {tr(INTENSITY_LABEL[i])}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted">{tr("Animation also stops by itself when your device asks for reduced motion, and while this tab is hidden.")}</p>
      </div>

      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles size={13} className="text-[#c4b5fd]" aria-hidden="true" />
          {tr("Live preview")}
        </p>
        <div className="relative mt-2 h-44 overflow-hidden rounded-2xl border border-glass-border bg-background">
          {r.art ? <Scene art={r.art} particle={r.particle} weather={r.weather} fireworks={r.fireworks} animate={r.animate} density={r.density} veil={0.3} /> : <div className="flex h-full items-center justify-center text-xs text-muted">{tr("Plain background")}</div>}
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl border border-glass-border bg-glass-bg px-3 py-2 backdrop-blur-xl">
            <p className="text-xs font-semibold text-foreground">{tr("Today in Japan")}</p>
            <p className="text-[11px] text-muted">{tr("Your text and cards stay readable on top.")}</p>
          </div>
        </div>
        {shown.mode === "auto" && <p className="mt-1.5 text-[11px] text-muted">{tr("Auto follows the season and adds rain, snow, clouds or sunshine only when the real weather for your city says so.")}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => {
            if (draft) setPrefs(draft);
            setDraft(null);
          }}
          className="rounded-full bg-gradient-to-r from-azure to-neon-purple px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure disabled:cursor-not-allowed disabled:opacity-40"
        >
          {tr("Apply")}
        </button>
        {dirty && (
          <button type="button" onClick={() => setDraft(null)} className="text-xs font-medium text-muted underline-offset-2 hover:text-foreground hover:underline">
            {tr("Cancel")}
          </button>
        )}
        <p className="text-[11px] text-muted">{configured && user ? tr("Saved to your account.") : tr("Saved on this device. Sign in to keep it across devices.")}</p>
      </div>
    </div>
  );
}
