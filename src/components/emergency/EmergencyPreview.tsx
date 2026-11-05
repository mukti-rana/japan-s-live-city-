"use client";

import Link from "next/link";
import { Activity, ArrowRight, Cross, Landmark, PhoneCall, ShieldAlert, Siren, Zap } from "lucide-react";
import PlacePicker from "@/components/news/PlacePicker";
import WidgetFrame from "@/components/home/WidgetFrame";
import { useLazyJson } from "@/components/map/useMapData";
import { QUICK_NUMBERS } from "@/lib/emergency/content";
import type { AlertsResult, OfficialAlert } from "@/lib/emergency/disaster";
import { haversineKm, PREFECTURE_CENTER } from "@/lib/events/geo";
import type { Facility, FacilityType, Shelter } from "@/lib/emergency/nearby";
import { pickJaEn, useInline, type Table, localizeAlert } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MAP_CITIES } from "@/lib/map/cities";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

const TEXT = {
  calls: { en: "Emergency calls", ja: "緊急通報" },
  callNote: { en: "Free, 24 hours. Tapping a number opens your phone's dialler — nothing is called until you confirm there.", ja: "無料・24時間。番号をタップすると電話アプリが開きます。そこで確認するまで発信されません。" },
  quakes: { en: "Earthquake & tsunami", ja: "地震・津波" },
  quakesNone: { en: "No earthquake or tsunami reports in the last 24 hours.", ja: "過去24時間に地震・津波の発表はありません。" },
  quakesDown: { en: "Earthquake information is unavailable right now.", ja: "地震情報を取得できません。" },
  checked: { en: "Checked", ja: "確認" },
  nearby: { en: "Near you", ja: "近くの施設" },
  chooseHere: { en: "Choose where you are to see what's nearby.", ja: "場所を選ぶと近くの施設が表示されます。" },
  approx: { en: "from the centre of", ja: "中心点からの距離：" },
  hospitals: { en: "Hospitals & clinics", ja: "病院・診療所" },
  police: { en: "Police stations (koban)", ja: "警察署・交番" },
  shelters: { en: "Evacuation shelters", ja: "避難所" },
  aed: { en: "AED locations", ja: "AED設置場所" },
  none: { en: "None found within range in the data", ja: "データ上、範囲内に見つかりません" },
  unavailable: { en: "Unavailable right now", ja: "現在取得できません" },
  loading: { en: "Checking…", ja: "確認中…" },
  open: { en: "Open Emergency Center", ja: "緊急センターを開く" },
  sources: { en: "Alerts: Japan Meteorological Agency. Shelters: Geospatial Information Authority of Japan. Hospitals, police and AEDs: OpenStreetMap volunteers — may be incomplete, so verify before relying on them.", ja: "警報：気象庁。避難所：国土地理院。病院・警察・AED：OpenStreetMapの投稿者データ（不完全な場合があります。必ずご確認ください）。" },
  official: { en: "Official", ja: "公式" },
  communityNote: { en: "Community-mapped", ja: "有志の地図データ" },
} satisfies Table;

const SEV_DOT: Record<string, string> = { emergency: "bg-red-500", warning: "bg-orange-400", advisory: "bg-yellow-300", info: "bg-sky-300" };

const hhmm = (iso: string | number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) + " JST";

// Where distances are measured from: the centre of the city or prefecture the
// visitor chose (or that the browser's location resolved to). Never exact.
function originFor(place: string | null): { lat: number; lon: number } | null {
  if (!place) return null;
  const city = MAP_CITIES.find((c) => c.name.toLowerCase() === place.toLowerCase());
  if (city) return { lat: city.lat, lon: city.lon };
  const pref = resolvePlace(place);
  const centre = pref ? PREFECTURE_CENTER[pref.prefectureId] : null;
  return centre ? { lat: centre[0], lon: centre[1] } : null;
}

function Row({ icon, label, status, tone }: { icon: React.ReactNode; label: string; status: string; tone?: "ok" | "muted" }) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-glass-bg px-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-azure/12 text-azure">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className={`truncate text-[11px] ${tone === "ok" ? "text-foreground/85" : "text-muted"}`}>{status}</p>
      </div>
    </li>
  );
}

// The Home dashboard's Emergency & Safety preview: the three emergency
// numbers, the latest official earthquake/tsunami reports, and the nearest
// emergency services for the place the visitor has chosen. It asks for no new
// permission — it uses the place already chosen or resolved on the site — and
// every live line carries its source and time, or says it is unavailable.
export default function EmergencyPreview() {
  const { language } = useLanguage();
  const x = useInline(TEXT);
  const placeInfo = useNewsPlace();
  const origin = originFor(placeInfo.place);
  const point = origin ? `lat=${origin.lat.toFixed(2)}&lon=${origin.lon.toFixed(2)}` : null;

  const alerts = useLazyJson<AlertsResult>("/api/emergency/alerts");
  const facilities = useLazyJson<{ facilities: Facility[]; unavailable?: boolean }>(point ? `/api/emergency/facilities?${point}` : null);
  const shelters = useLazyJson<{ shelters: Shelter[]; unavailable?: boolean }>(point ? `/api/emergency/shelters?${point}` : null);

  const events: OfficialAlert[] = (alerts.data?.alerts ?? []).filter((a) => a.kind === "earthquake" || a.kind === "tsunami").slice(0, 2);
  const quakeSourceOk = alerts.data ? alerts.data.sources.filter((s) => /earthquake|tsunami/i.test(s.name)).every((s) => s.ok) : false;

  function nearest(kind: "facility" | "shelter", types: FacilityType[] = []): { status: string; ok: boolean } {
    if (!origin) return { status: x("chooseHere"), ok: false };
    const src = kind === "shelter" ? shelters : facilities;
    if (src.loading) return { status: x("loading"), ok: false };
    if (src.failed || (kind === "shelter" ? shelters.data?.unavailable : facilities.data?.unavailable)) return { status: x("unavailable"), ok: false };
    const list =
      kind === "shelter"
        ? (shelters.data?.shelters ?? []).map((s) => ({ name: s.name, lat: s.lat, lon: s.lon }))
        : (facilities.data?.facilities ?? []).filter((f) => types.includes(f.type)).map((f) => ({ name: (language === "ja" ? f.name : f.nameEn ?? f.name) ?? f.name ?? "", lat: f.lat, lon: f.lon }));
    if (list.length === 0) return { status: x("none"), ok: false };
    const best = list.map((p) => ({ ...p, km: haversineKm(origin.lat, origin.lon, p.lat, p.lon) })).sort((a, b) => a.km - b.km)[0];
    return { status: `${best.name || "—"} · ${best.km < 1 ? `${Math.round(best.km * 10) * 100} m` : `${best.km.toFixed(1)} km`}`, ok: true };
  }

  const hospital = nearest("facility", ["hospital", "clinic"]);
  const police = nearest("facility", ["police"]);
  const shelter = nearest("shelter");
  const aed = nearest("facility", ["aed"]);

  return (
    <WidgetFrame icon={ShieldAlert} labelKey="widget.emergencySafety" accent="red" className="h-full">
      <section aria-label={x("calls")}>
        <ul className="grid grid-cols-3 gap-2">
          {QUICK_NUMBERS.map((q) => (
            <li key={q.id}>
              <a
                href={`tel:${q.number}`}
                aria-label={`${x("calls")}: ${q.number} — ${pickJaEn(q.label, language)}`}
                className="flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-xl border border-red-400/30 bg-red-500/10 px-1 text-center transition-colors hover:border-red-300/60 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                <span className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums leading-none text-red-500 [text-shadow:0_0_14px_rgba(239,68,68,0.45)]">
                  <PhoneCall size={14} className="text-red-500" aria-hidden="true" />
                  {q.number}
                </span>
                <span className="text-[10px] font-medium leading-tight text-foreground/80">{pickJaEn(q.label, language)}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">{x("callNote")}</p>
      </section>

      <section aria-label={x("quakes")} className="rounded-xl border border-glass-border bg-glass-bg p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <Activity size={12} aria-hidden="true" />
            {x("quakes")}
          </h3>
          <span className="rounded-full border border-azure/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-azure">{x("official")} · JMA</span>
        </div>
        {alerts.loading ? (
          <p className="mt-2 text-xs text-muted">{x("loading")}</p>
        ) : alerts.failed || !alerts.data || !quakeSourceOk ? (
          <p className="mt-2 text-xs text-gold">{x("quakesDown")}</p>
        ) : events.length === 0 ? (
          <p className="mt-2 text-xs text-foreground/85">{x("quakesNone")}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {events.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEV_DOT[a.severity] ?? "bg-sky-300"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-azure">
                    {localizeAlert(a, language)}
                  </a>
                  <span className="block text-[11px] text-muted">
                    {a.area ? `${a.area} · ` : ""}
                    {hhmm(a.issuedAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {alerts.data && <p className="mt-2 text-[10px] text-muted">{x("checked")} {hhmm(alerts.data.checkedAt)}</p>}
      </section>

      <section aria-label={x("nearby")} className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{x("nearby")}</h3>
          {placeInfo.place && origin && (
            <span className="text-[10px] text-muted">
              {x("approx")} {placeInfo.place}
            </span>
          )}
        </div>
        {!placeInfo.place && <PlacePicker current={placeInfo} compact />}
        <ul className="grid gap-2 sm:grid-cols-2">
          <Row icon={<Cross size={15} aria-hidden="true" />} label={x("hospitals")} status={hospital.status} tone={hospital.ok ? "ok" : "muted"} />
          <Row icon={<Siren size={15} aria-hidden="true" />} label={x("police")} status={police.status} tone={police.ok ? "ok" : "muted"} />
          <Row icon={<Landmark size={15} aria-hidden="true" />} label={x("shelters")} status={shelter.status} tone={shelter.ok ? "ok" : "muted"} />
          <Row icon={<Zap size={15} aria-hidden="true" />} label={x("aed")} status={aed.status} tone={aed.ok ? "ok" : "muted"} />
        </ul>
      </section>

      <Link
        href="/emergency"
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-gradient-to-r from-red-600/25 to-neon-purple/20 text-sm font-semibold text-foreground transition-all hover:border-red-300/70 hover:from-red-600/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 active:scale-[0.99]"
      >
        {x("open")}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>

      <p className="text-[10px] leading-snug text-muted">{x("sources")}</p>
    </WidgetFrame>
  );
}
