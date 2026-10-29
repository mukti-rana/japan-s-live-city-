"use client";

import { useEffect, useState } from "react";
import { ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import PlacePicker from "@/components/news/PlacePicker";
import { OFFICIAL_LINKS } from "@/lib/emergency/content";
import type { AlertsResult, OfficialAlert, Severity } from "@/lib/emergency/disaster";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { resolvePlace } from "@/lib/news/places";
import { useNewsPlace } from "@/lib/news/useNews";

const SEV_STYLE: Record<Severity, string> = {
  emergency: "bg-red-600 text-white",
  warning: "bg-orange-500 text-black",
  advisory: "bg-yellow-300 text-black",
  info: "bg-sky-300 text-black",
};

function when(iso: string, language: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(language, { timeZone: "Asia/Tokyo", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) + " JST";
}

interface Loaded {
  key: string;
  data?: AlertsResult;
  failed?: boolean;
}

// Official JMA information. Everything here has an issuer, a time and a link;
// anything cancelled or too old is left out (the server decides), and a
// failure is shown as a failure — never as "all clear".
export default function OfficialAlerts() {
  const t = useInline(E);
  const { language } = useLanguage();
  const placeInfo = useNewsPlace();
  const prefecture = resolvePlace(placeInfo.place)?.prefectureId ?? null;
  const key = `/api/emergency/alerts?pref=${prefecture ?? ""}`;
  const [state, setState] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(key, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<AlertsResult>) : Promise.reject(new Error("failed"))))
      .then((data) => setState({ key, data }))
      .catch((error: unknown) => {
        if ((error as { name?: string })?.name !== "AbortError") setState({ key, failed: true });
      });
    return () => controller.abort();
  }, [key, attempt]);

  const current = state && state.key === key ? state : null;
  const data = current?.data;
  const warningsOk = data?.sources.find((s) => s.name.includes("warnings"))?.ok ?? false;
  const allOk = data ? data.sources.every((s) => s.ok) : false;
  const sev = (s: Severity) => (s === "emergency" ? t("sevEmergency") : s === "warning" ? t("sevWarning") : s === "advisory" ? t("sevAdvisory") : t("sevInfo"));

  return (
    <section id="alerts" aria-labelledby="alerts-title" className="scroll-mt-24 rounded-2xl border border-white/15 bg-panel p-4 sm:p-5">
      <h2 id="alerts-title" className="text-lg font-bold text-foreground">
        {t("alertsTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("alertsIntro")}</p>

      <div className="mt-3 rounded-xl border border-white/15 bg-black/20 p-3.5">
        <PlacePicker current={placeInfo} compact />
        {!prefecture && <p className="mt-2 text-xs text-muted">{t("alertsChooseArea")}</p>}
      </div>

      <div className="mt-4" aria-live="polite">
        {!current ? (
          <p role="status" className="p-3 text-sm text-muted">{t("locating")}</p>
        ) : current.failed || !data ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
            <TriangleAlert size={18} aria-hidden="true" />
            <span className="flex-1">{t("alertsFailed")}</span>
            <button type="button" onClick={() => { setState(null); setAttempt((n) => n + 1); }} className="min-h-10 rounded-lg border border-amber-300/50 px-4 font-semibold hover:bg-amber-300/15">
              {t("retry")}
            </button>
          </div>
        ) : (
          <>
            {data.alerts.length === 0 ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
                <p className="text-sm text-foreground/90">{allOk && data.notes.length === 0 ? t("alertsNone") : t("alertsCantConfirm")}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {data.alerts.map((a: OfficialAlert) => (
                  <li key={a.id} className="rounded-xl border border-white/20 bg-black/25 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${SEV_STYLE[a.severity]}`}>{a.kind === "earthquake" ? t("sevQuake") : sev(a.severity)}</span>
                      <p className="text-base font-semibold text-foreground">{language === "ja" ? a.titleJa : a.title}</p>
                    </div>
                    {a.area && (
                      <p className="mt-1 text-sm text-foreground/85">
                        <span className="text-muted">{t("alertsArea")}:</span> {a.area}
                      </p>
                    )}
                    {a.detail && <p className="mt-0.5 text-xs text-muted">{a.detail}</p>}
                    <p className="mt-1 text-xs text-muted">
                      {t("alertsIssuedBy")}: {a.issuer} · {t("alertsIssued")}: {when(a.issuedAt, language)}
                    </p>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-azure hover:underline">
                      {t("alertsLink")}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {data.notes.map((n) => (
              <p key={n} className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
                {n}
              </p>
            ))}
            {data.sources.filter((s) => !s.ok).map((s) => (
              <p key={s.name} className="mt-2 text-xs text-amber-200">
                {s.name}: {t("alertsFailed")}
              </p>
            ))}
            {!warningsOk && prefecture && <p className="mt-2 text-xs text-amber-200">{t("alertsCantConfirm")}</p>}

            <p className="mt-3 text-[11px] text-muted">
              {t("alertsChecked")}: {when(new Date(data.checkedAt).toISOString(), language)} · {data.coverage ? `JMA: ${data.coverage}` : "JMA"}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/15 p-3.5">
        <p className="text-sm text-foreground/85">{t("alertsEvac")}</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {[
            ["JMA warnings map", OFFICIAL_LINKS.jmaWarnings],
            ["JMA earthquakes", OFFICIAL_LINKS.jmaEarthquakes],
            ["JMA typhoons", OFFICIAL_LINKS.jmaTyphoon],
            ["Hazard map portal", OFFICIAL_LINKS.hazardMap],
            ["JNTO Safety Tips", OFFICIAL_LINKS.jntoSafety],
          ].map(([label, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-azure hover:underline">
                {label}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
