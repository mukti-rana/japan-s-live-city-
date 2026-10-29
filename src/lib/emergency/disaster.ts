import { getPrefecture } from "@/lib/news/places";

// Official disaster information from the Japan Meteorological Agency (JMA),
// read from the public JSON the agency's own warning map uses:
//   warnings & advisories : /bosai/warning/data/warning/<office>.json
//   earthquakes           : /bosai/quake/data/list.json
//   tsunami               : /bosai/tsunami/data/list.json
//   typhoons              : /bosai/typhoon/data/targetTc.json
// Everything shown carries its issuer, time and a link to the JMA map. Anything
// the agency has cancelled or let expire is not shown as active. Evacuation
// advisories and orders are issued by each municipality and have no open
// national feed, so the page links to official sources instead of showing them.

const JMA = "https://www.jma.go.jp/bosai";
const USER_AGENT = "LiveCityJapan/1.0 (educational project; emergency information)";
const REVALIDATE = 60;

// A warning report older than this is never shown as active. JMA re-issues or
// cancels warnings within hours, so a report this old is stale data, not a
// current warning.
const WARNING_MAX_AGE_MS = 36 * 3600_000;

export type Severity = "emergency" | "warning" | "advisory" | "info";

export interface OfficialAlert {
  id: string;
  kind: "warning" | "earthquake" | "tsunami" | "typhoon";
  title: string;
  titleJa: string;
  // Where it applies.
  area: string;
  // Who issued it.
  issuer: string;
  issuedAt: string;
  severity: Severity;
  url: string;
  detail?: string;
}

// Warning codes used in JMA's data.
const WARNINGS: Record<string, { ja: string; en: string; severity: Severity }> = {
  "32": { ja: "暴風雪特別警報", en: "Emergency blizzard warning", severity: "emergency" },
  "33": { ja: "大雨特別警報", en: "Emergency heavy rain warning", severity: "emergency" },
  "35": { ja: "暴風特別警報", en: "Emergency storm warning", severity: "emergency" },
  "36": { ja: "大雪特別警報", en: "Emergency heavy snow warning", severity: "emergency" },
  "37": { ja: "波浪特別警報", en: "Emergency high wave warning", severity: "emergency" },
  "38": { ja: "高潮特別警報", en: "Emergency storm surge warning", severity: "emergency" },
  "02": { ja: "暴風雪警報", en: "Blizzard warning", severity: "warning" },
  "03": { ja: "大雨警報", en: "Heavy rain warning", severity: "warning" },
  "04": { ja: "洪水警報", en: "Flood warning", severity: "warning" },
  "05": { ja: "暴風警報", en: "Storm warning", severity: "warning" },
  "06": { ja: "大雪警報", en: "Heavy snow warning", severity: "warning" },
  "07": { ja: "波浪警報", en: "High wave warning", severity: "warning" },
  "08": { ja: "高潮警報", en: "Storm surge warning", severity: "warning" },
  "10": { ja: "大雨注意報", en: "Heavy rain advisory", severity: "advisory" },
  "12": { ja: "大雪注意報", en: "Heavy snow advisory", severity: "advisory" },
  "13": { ja: "風雪注意報", en: "Wind and snow advisory", severity: "advisory" },
  "14": { ja: "雷注意報", en: "Thunderstorm advisory", severity: "advisory" },
  "15": { ja: "強風注意報", en: "Strong wind advisory", severity: "advisory" },
  "16": { ja: "波浪注意報", en: "High wave advisory", severity: "advisory" },
  "17": { ja: "融雪注意報", en: "Snow melt advisory", severity: "advisory" },
  "18": { ja: "洪水注意報", en: "Flood advisory", severity: "advisory" },
  "19": { ja: "高潮注意報", en: "Storm surge advisory", severity: "advisory" },
  "20": { ja: "濃霧注意報", en: "Dense fog advisory", severity: "advisory" },
  "21": { ja: "乾燥注意報", en: "Dry air advisory", severity: "advisory" },
  "22": { ja: "なだれ注意報", en: "Avalanche advisory", severity: "advisory" },
  "23": { ja: "低温注意報", en: "Low temperature advisory", severity: "advisory" },
  "24": { ja: "霜注意報", en: "Frost advisory", severity: "advisory" },
  "25": { ja: "着氷注意報", en: "Ice accretion advisory", severity: "advisory" },
  "26": { ja: "着雪注意報", en: "Snow accretion advisory", severity: "advisory" },
  "27": { ja: "その他の注意報", en: "Other advisory", severity: "advisory" },
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(9000),
    next: { revalidate: REVALIDATE },
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ── Which JMA offices cover a prefecture ─────────────────────────────────

interface AreaFile {
  centers: Record<string, { name: string }>;
  offices: Record<string, { name: string; enName?: string; officeName: string; parent: string }>;
  class20s: Record<string, { name: string; enName?: string }>;
}

function officesFor(area: AreaFile, prefectureId: string): string[] {
  const pref = getPrefecture(prefectureId);
  if (!pref) return [];
  const entries = Object.entries(area.offices);

  // Hokkaido and Okinawa are covered by several regional offices.
  if (prefectureId === "hokkaido" || prefectureId === "okinawa") {
    const center = Object.entries(area.centers).find(([, c]) => c.name === (prefectureId === "hokkaido" ? "北海道地方" : "沖縄地方"))?.[0];
    return entries.filter(([, o]) => o.parent === center).map(([code]) => code);
  }
  // "京都" is a substring of "東京都", so match the whole name.
  const full = pref.ja + (prefectureId === "tokyo" ? "都" : prefectureId === "kyoto" || prefectureId === "osaka" ? "府" : "県");
  const codes = entries.filter(([, o]) => o.name === full || o.name.startsWith(`${full}（`)).map(([code]) => code);
  // Kagoshima's islands are a separate office.
  if (prefectureId === "kagoshima") codes.push(...entries.filter(([, o]) => o.name === "奄美地方").map(([code]) => code));
  return codes;
}

// ── Warnings and advisories ──────────────────────────────────────────────

interface WarningFile {
  reportDatetime: string;
  publishingOffice: string;
  headlineText?: string;
  areaTypes: { areas: { code: string; warnings?: { code: string; status: string }[] }[] }[];
}

interface OfficeWarnings {
  alerts: OfficialAlert[];
  // Set when the office's latest report was too old to treat as current.
  staleNote: string | null;
}

async function warningsFor(area: AreaFile, officeCode: string): Promise<OfficeWarnings> {
  const file = await getJson<WarningFile>(`${JMA}/warning/data/warning/${officeCode}.json`);
  const office = area.offices[officeCode];
  const ageMs = Date.now() - new Date(file.reportDatetime).getTime();
  if (!Number.isFinite(ageMs) || ageMs > WARNING_MAX_AGE_MS) {
    return {
      alerts: [],
      staleNote: `${file.publishingOffice}: the latest report is from ${file.reportDatetime.slice(0, 10)}, too old to show as current. Check the JMA site.`,
    };
  }
  // Municipality-level areas (the second area type); fall back to the first.
  const areas = file.areaTypes[1]?.areas ?? file.areaTypes[0]?.areas ?? [];

  // Group municipalities by warning, keeping only those still in effect.
  const byCode = new Map<string, string[]>();
  for (const a of areas) {
    for (const w of a.warnings ?? []) {
      if (!WARNINGS[w.code] || w.status === "解除") continue; // cancelled
      byCode.set(w.code, [...(byCode.get(w.code) ?? []), area.class20s[a.code]?.enName ?? area.class20s[a.code]?.name ?? a.code]);
    }
  }

  const alerts = [...byCode.entries()].map(([code, places]) => {
    const w = WARNINGS[code];
    const shown = places.slice(0, 6).join(", ");
    return {
      id: `warn-${officeCode}-${code}`,
      kind: "warning" as const,
      title: w.en,
      titleJa: w.ja,
      area: `${shown}${places.length > 6 ? ` +${places.length - 6}` : ""} (${office?.enName ?? office?.name ?? officeCode})`,
      issuer: file.publishingOffice,
      issuedAt: file.reportDatetime,
      severity: w.severity,
      url: `https://www.jma.go.jp/bosai/map.html#contents=warning`,
    };
  });
  return { alerts, staleNote: null };
}

// ── Earthquakes ──────────────────────────────────────────────────────────

interface QuakeEntry {
  eid: string;
  rdt: string;
  at: string;
  ttl: string;
  anm?: string;
  mag?: string;
  maxi?: string;
  en_ttl?: string;
  en_anm?: string;
}

// JMA's maximum seismic intensity (shindo) scale.
const INTENSITY_ORDER = ["1", "2", "3", "4", "5-", "5+", "6-", "6+", "7"];
function intensityLabel(maxi: string): string {
  return maxi.replace("-", " lower").replace("+", " upper");
}

async function recentQuakes(minIntensity: string, hours: number): Promise<OfficialAlert[]> {
  const list = await getJson<QuakeEntry[]>(`${JMA}/quake/data/list.json`);
  const since = Date.now() - hours * 3600_000;
  const min = INTENSITY_ORDER.indexOf(minIntensity);
  const seen = new Set<string>();
  const out: OfficialAlert[] = [];
  for (const q of list) {
    if (q.ttl !== "震源・震度情報" || !q.maxi || seen.has(q.eid)) continue;
    if (new Date(q.at).getTime() < since || INTENSITY_ORDER.indexOf(q.maxi) < min) continue;
    seen.add(q.eid);
    const idx = INTENSITY_ORDER.indexOf(q.maxi);
    out.push({
      id: `eq-${q.eid}`,
      kind: "earthquake",
      title: `Earthquake — seismic intensity ${intensityLabel(q.maxi)}${q.mag ? `, magnitude ${q.mag}` : ""}`,
      titleJa: `地震 震度${q.maxi.replace("-", "弱").replace("+", "強")}${q.mag ? `・M${q.mag}` : ""}`,
      area: q.anm ?? "",
      issuer: "Japan Meteorological Agency",
      issuedAt: q.rdt,
      severity: idx >= 6 ? "emergency" : idx >= 4 ? "warning" : "info",
      url: "https://www.jma.go.jp/bosai/map.html#contents=earthquake_map",
      detail: "Information about an earthquake that has already happened — not a warning.",
    });
  }
  return out;
}

// ── Tsunami ──────────────────────────────────────────────────────────────

interface TsunamiEntry {
  eid: string;
  rdt: string;
  ttl: string;
  ift?: string;
  anm?: string;
  kind?: { code: string; kind: string }[];
}

async function recentTsunami(hours: number): Promise<OfficialAlert[]> {
  const list = await getJson<TsunamiEntry[]>(`${JMA}/tsunami/data/list.json`);
  const since = Date.now() - hours * 3600_000;
  const out: OfficialAlert[] = [];
  for (const t of list) {
    if (new Date(t.rdt).getTime() < since) continue;
    const kinds = [...new Set((t.kind ?? []).map((k) => k.kind))];
    const text = `${t.ttl} ${kinds.join(" ")}`;
    // Cancelled, or only "no tsunami expected": not an active alert.
    if (t.ift === "取消" || /解除|心配なし|被害の心配/.test(text)) continue;
    const severity: Severity = /大津波警報/.test(text) ? "emergency" : /津波警報/.test(text) ? "warning" : /津波注意報/.test(text) ? "advisory" : "info";
    out.push({
      id: `ts-${t.eid}-${t.rdt}`,
      kind: "tsunami",
      title: severity === "info" ? "Tsunami forecast — slight sea-level changes possible" : "Tsunami warning or advisory",
      titleJa: kinds[0] ?? t.ttl,
      area: t.anm ?? "",
      issuer: "Japan Meteorological Agency",
      issuedAt: t.rdt,
      severity,
      url: "https://www.jma.go.jp/bosai/map.html#contents=tsunami",
    });
  }
  return out;
}

// ── Typhoons ─────────────────────────────────────────────────────────────

interface TyphoonEntry {
  tropicalCyclone: string;
  typhoonNumber: string;
  category: string;
  issue: string;
}

const TYPHOON_CATEGORY: Record<string, string> = { TD: "Tropical depression", TS: "Tropical storm", STS: "Severe tropical storm", TY: "Typhoon" };

async function activeTyphoons(): Promise<OfficialAlert[]> {
  const list = await getJson<TyphoonEntry[]>(`${JMA}/typhoon/data/targetTc.json`);
  const fresh = list.filter((t) => Date.now() - new Date(t.issue).getTime() < 48 * 3600_000);
  return fresh.map((t) => {
    const number = Number(t.typhoonNumber) % 100;
    const category = TYPHOON_CATEGORY[t.category] ?? t.category;
    return {
      id: `ty-${t.tropicalCyclone}`,
      kind: "typhoon" as const,
      title: `${category} No. ${number}`,
      titleJa: `台風${number}号`,
      area: "Track and forecast on the JMA site",
      issuer: "Japan Meteorological Agency",
      issuedAt: t.issue,
      severity: "info" as const,
      url: "https://www.jma.go.jp/bosai/map.html#contents=typhoon",
    };
  });
}

// ── Putting it together ───────────────────────────────────────────────────

export interface SourceReport {
  name: string;
  ok: boolean;
  error?: string;
}

export interface AlertsResult {
  alerts: OfficialAlert[];
  sources: SourceReport[];
  checkedAt: number;
  // Name of the JMA office(s) the warnings were read from.
  coverage: string | null;
  // Things worth telling the reader, such as a report that was too old to use.
  notes: string[];
}

const SEVERITY_RANK: Record<Severity, number> = { emergency: 0, warning: 1, advisory: 2, info: 3 };

export async function getOfficialAlerts(prefectureId: string | null): Promise<AlertsResult> {
  const sources: SourceReport[] = [];
  const alerts: OfficialAlert[] = [];
  let coverage: string | null = null;
  const notes: string[] = [];

  async function run<T>(name: string, job: () => Promise<T[]>): Promise<T[]> {
    try {
      const result = await job();
      sources.push({ name, ok: true });
      return result;
    } catch (error) {
      sources.push({ name, ok: false, error: error instanceof Error ? error.message : "Request failed" });
      return [];
    }
  }

  const [warnings, quakes, tsunami, typhoons] = await Promise.all([
    prefectureId
      ? run("JMA warnings & advisories", async () => {
          const area = await getJson<AreaFile>(`${JMA}/common/const/area.json`);
          const offices = officesFor(area, prefectureId);
          if (offices.length === 0) throw new Error("No JMA office found for this prefecture");
          coverage = offices.map((c) => area.offices[c].officeName).join(", ");
          const reports = await Promise.all(offices.map((o) => warningsFor(area, o)));
          const stale = reports.filter((r) => r.staleNote);
          if (stale.length > 0) {
            notes.push(
              `The latest JMA warning report${stale.length > 1 ? `s for ${stale.length} offices are` : " for this area is"} more than 36 hours old, so no warnings or advisories are shown as current here. Check the JMA site for the live picture.`,
            );
          }
          return reports.flatMap((r) => r.alerts);
        })
      : Promise.resolve([] as OfficialAlert[]),
    run("JMA earthquake information", () => recentQuakes("3", 24)),
    run("JMA tsunami information", () => recentTsunami(24)),
    run("JMA typhoon information", activeTyphoons),
  ]);

  alerts.push(...warnings, ...tsunami, ...typhoons, ...quakes);
  alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.issuedAt.localeCompare(a.issuedAt));
  return { alerts, sources, checkedAt: Date.now(), coverage, notes: [...new Set(notes)] };
}
