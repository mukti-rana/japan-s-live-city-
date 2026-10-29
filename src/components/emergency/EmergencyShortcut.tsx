"use client";

import Link from "next/link";
import { ArrowRight, PhoneCall, Siren } from "lucide-react";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";

// A permanent shortcut at the top of the Home page. It is bundled content, so
// it appears with the page and works even if every other service is down.
export default function EmergencyShortcut() {
  const t = useInline(E);
  const calls = [
    { n: "110", label: { en: "Police", ja: "警察" } },
    { n: "119", label: { en: "Fire / Ambulance", ja: "消防・救急" } },
    { n: "118", label: { en: "Coast Guard", ja: "海上保安庁" } },
  ];
  return (
    <section aria-label={t("title")} className="flex flex-col gap-3 rounded-2xl border-2 border-red-500/60 bg-[#2b0b12] p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <div className="flex items-center gap-2.5 text-red-100 sm:min-w-[11rem]">
        <Siren size={22} aria-hidden="true" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">{t("homeTitle")}</p>
          <p className="text-[11px] text-red-100/70">{t("free24").split(" · ").slice(0, 2).join(" · ")}</p>
        </div>
      </div>
      <ul className="grid flex-1 grid-cols-3 gap-2">
        {calls.map((c) => (
          <li key={c.n}>
            <a
              href={`tel:${c.n}`}
              aria-label={`${t("call")} ${c.n}`}
              className="flex min-h-14 flex-col items-center justify-center rounded-xl bg-red-600 px-2 py-1.5 text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <span className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums leading-none">
                <PhoneCall size={16} aria-hidden="true" />
                {c.n}
              </span>
              <span className="mt-0.5 text-[10px] font-medium leading-tight text-red-50">{c.label.en}</span>
            </a>
          </li>
        ))}
      </ul>
      <Link
        href="/emergency"
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-red-400/50 px-4 text-sm font-semibold text-red-100 hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
      >
        {t("homeMore")}
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
