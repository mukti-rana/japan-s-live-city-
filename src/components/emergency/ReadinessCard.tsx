"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";
import { E } from "@/lib/emergency/strings";
import { useInline } from "@/lib/i18n/inline";

const KEY = "livecity:readiness";
const EVENT = "livecity:readiness";

interface Contact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface Card {
  contacts: Contact[];
  meeting: string;
  hospital: string;
  notes: string;
}

const EMPTY: Card = { contacts: [], meeting: "", hospital: "", notes: "" };

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function snapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): Card {
  try {
    const p = JSON.parse(raw) as Partial<Card>;
    return {
      contacts: Array.isArray(p.contacts) ? p.contacts.slice(0, 8).map((c) => ({ id: String(c.id), name: String(c.name ?? ""), phone: String(c.phone ?? ""), relation: String(c.relation ?? "") })) : [],
      meeting: String(p.meeting ?? ""),
      hospital: String(p.hospital ?? ""),
      notes: String(p.notes ?? ""),
    };
  } catch {
    return EMPTY;
  }
}

function save(card: Card) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(card));
  } catch {
    // Storage unavailable — nothing is saved, and the card says so below.
  }
  window.dispatchEvent(new Event(EVENT));
}

const field =
  "min-h-11 w-full rounded-xl border border-white/20 bg-background px-3 text-base text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// An optional card the visitor fills in for themselves. It lives only in this
// browser's local storage: it is never sent anywhere, never shown to anyone,
// and holds nothing but what the visitor types.
export default function ReadinessCard() {
  const t = useInline(E);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  const card = useMemo(() => (raw ? parse(raw) : EMPTY), [raw]);

  const update = useCallback((patch: Partial<Card>) => save({ ...parse(snapshot() || "{}"), ...patch }), []);
  const setContact = (id: string, patch: Partial<Contact>) => update({ contacts: parse(snapshot() || "{}").contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const hasData = Boolean(raw && (card.contacts.length || card.meeting || card.hospital || card.notes));

  return (
    <section id="readiness" aria-labelledby="ready-title" className="scroll-mt-24 rounded-2xl border border-white/15 bg-panel p-4 sm:p-5">
      <h2 id="ready-title" className="text-lg font-bold text-foreground">
        {t("readyTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("readyIntro")}</p>
      <p className="mt-2 rounded-xl border border-white/15 bg-black/20 p-3 text-xs leading-relaxed text-foreground/80">{t("readyStorage")}</p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("readyContacts")}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {card.contacts.map((c) => (
              <li key={c.id} className="grid gap-2 rounded-xl border border-white/15 p-2.5 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
                <input aria-label={t("readyName")} placeholder={t("readyName")} value={c.name} onChange={(e) => setContact(c.id, { name: e.target.value.slice(0, 60) })} className={field} />
                <input aria-label={t("readyPhone")} placeholder={t("readyPhone")} inputMode="tel" value={c.phone} onChange={(e) => setContact(c.id, { phone: e.target.value.slice(0, 30) })} className={field} />
                <input aria-label={t("readyRelation")} placeholder={t("readyRelation")} value={c.relation} onChange={(e) => setContact(c.id, { relation: e.target.value.slice(0, 40) })} className={field} />
                <button type="button" onClick={() => update({ contacts: card.contacts.filter((x) => x.id !== c.id) })} aria-label={`${t("readyRemove")}: ${c.name || t("readyName")}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/20 text-foreground/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {card.contacts.length < 8 && (
            <button type="button" onClick={() => update({ contacts: [...card.contacts, { id: crypto.randomUUID(), name: "", phone: "", relation: "" }] })} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Plus size={15} aria-hidden="true" />
              {t("readyAdd")}
            </button>
          )}
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
          {t("readyMeeting")}
          <input value={card.meeting} onChange={(e) => update({ meeting: e.target.value.slice(0, 200) })} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
          {t("readyHospital")}
          <input value={card.hospital} onChange={(e) => update({ hospital: e.target.value.slice(0, 200) })} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-foreground">
          {t("readyNotes")}
          <textarea value={card.notes} onChange={(e) => update({ notes: e.target.value.slice(0, 1000) })} rows={4} className={`${field} py-2`} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {hasData && <span className="text-xs text-emerald-300">{t("readySaved")}</span>}
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-foreground hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
          <Printer size={15} aria-hidden="true" />
          {t("readyPrint")}
        </button>
        {hasData && (
          <button type="button" onClick={() => { try { window.localStorage.removeItem(KEY); } catch {} window.dispatchEvent(new Event(EVENT)); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-400/50 px-4 text-sm font-semibold text-red-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
            <Trash2 size={15} aria-hidden="true" />
            {t("readyClear")}
          </button>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted">{t("readySync")}</p>
    </section>
  );
}
