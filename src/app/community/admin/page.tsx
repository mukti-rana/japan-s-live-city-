import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import CommunityHero from "@/components/community/CommunityHero";
import LocalDate from "@/components/community/LocalDate";
import ModItemCard from "@/components/community/ModItemCard";
import ModerationActions, { type ActionSpec } from "@/components/community/ModerationActions";
import Tx from "@/components/i18n/Tx";
import { countOpenReports, fetchAllByStatus, fetchLog, fetchReportGroups, fetchSuspensions } from "@/lib/community/adminQuery";
import { REASON_LABEL, TARGET_LABEL } from "@/lib/community/moderation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// No title here on purpose: for anyone who is not a moderator this page is a plain
// "not found", and a title would give its existence away.
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const VIEWS = ["reports", "pending", "hidden", "suspended", "log"] as const;
type View = (typeof VIEWS)[number];
const VIEW_TEXT: Record<View, string> = { reports: "Reports", pending: "Waiting for approval", hidden: "Hidden & rejected", suspended: "Suspended", log: "Activity log" };

const tab = (on: boolean) =>
  `inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${
    on ? "border-lilac/60 bg-lilac/20 text-lilac" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"
  }`;

const REPORT_ACTIONS: ActionSpec[] = [
  { action: "hide", label: "Hide it", tone: "warn" },
  { action: "dismiss", label: "Dismiss reports", tone: "neutral" },
  { action: "suspend", label: "Suspend author", tone: "bad" },
  { action: "delete", label: "Delete permanently", tone: "bad", confirm: "Yes, delete for good" },
];
const PENDING_ACTIONS: ActionSpec[] = [
  { action: "approve", label: "Approve", tone: "good" },
  { action: "reject", label: "Reject", tone: "bad" },
];
const HIDDEN_ACTIONS: ActionSpec[] = [
  { action: "restore", label: "Restore", tone: "good" },
  { action: "suspend", label: "Suspend author", tone: "bad" },
  { action: "delete", label: "Delete permanently", tone: "bad", confirm: "Yes, delete for good" },
];

const empty = (text: string) => (
  <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-10 text-center text-sm text-foreground/85">
    <Tx en={text} />
  </p>
);

// For moderators only. Anyone else gets an ordinary "not found" page, so the
// page's existence is not advertised. Everything here reads and writes with the
// moderator's own session; the database rules are the real lock.
export default async function ModerationPage({ searchParams }: PageProps<"/community/admin">) {
  if (!isSupabaseConfigured) notFound();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();
  const { data: isMod } = await supabase.rpc("is_moderator");
  if (isMod !== true) notFound();

  const sp = await searchParams;
  const asked = Array.isArray(sp.view) ? sp.view[0] : sp.view;
  const view: View = VIEWS.includes(asked as View) ? (asked as View) : "reports";
  const openReports = await countOpenReports(supabase);

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 pb-10">
      <CommunityHero>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lilac">
          <ShieldCheck size={14} aria-hidden="true" />
          <Tx en="Moderators only" />
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          <Tx en="Community moderation" />
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
          <Tx en="Review what people reported, approve or hide content, and suspend accounts. Every action is recorded in the activity log." />
        </p>
      </CommunityHero>

      <nav aria-labelledby="mod-views" className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <h2 id="mod-views" className="sr-only">
          <Tx en="Moderation" />
        </h2>
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {VIEWS.map((v) => (
            <li key={v} className="shrink-0">
              <Link href={`/community/admin?view=${v}`} aria-current={view === v ? "page" : undefined} className={tab(view === v)}>
                <Tx en={VIEW_TEXT[v]} />
                {v === "reports" && openReports > 0 && <span className="rounded-full bg-sakura px-2 py-0.5 text-[11px] font-bold text-background">{openReports}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {view === "reports" && <Reports supabase={supabase} />}
      {view === "pending" && <Pending supabase={supabase} />}
      {view === "hidden" && <Hidden supabase={supabase} />}
      {view === "suspended" && <Suspended supabase={supabase} />}
      {view === "log" && <Log supabase={supabase} />}
    </div>
  );
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function Reports({ supabase }: { supabase: Db }) {
  const groups = await fetchReportGroups(supabase);
  if (groups.length === 0) return empty("No open reports. Nothing needs your attention.");
  return (
    <ul className="flex flex-col gap-4">
      {groups.map((g) => {
        const summary = (
          <div className="mt-3 rounded-xl border border-sakura/30 bg-sakura/5 p-3 text-xs text-foreground">
            <p className="font-semibold text-sakura">
              {g.count} <Tx en={g.count === 1 ? "report" : "reports"} />
            </p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              {Object.entries(g.reasons).map(([reason, n]) => (
                <span key={reason} className="rounded-full bg-white/10 px-2.5 py-0.5">
                  <Tx en={REASON_LABEL[reason] ?? reason} /> × {n}
                </span>
              ))}
            </p>
            {g.notes.map((n, i) => (
              <p key={i} className="mt-1.5 break-words italic text-foreground/85">“{n}”</p>
            ))}
          </div>
        );
        return (
          <li key={`${g.targetType}:${g.targetId}`}>
            {g.item ? (
              <ModItemCard item={g.item} actions={REPORT_ACTIONS}>
                {summary}
              </ModItemCard>
            ) : (
              <article className="rounded-2xl border border-glass-border bg-panel/70 p-4">
                <p className="text-sm font-semibold text-foreground">
                  <Tx en={TARGET_LABEL[g.targetType]} />
                  {g.username && (
                    <>
                      {": "}
                      <Link href={`/community/u/${g.username}`} className="text-azure underline-offset-2 hover:underline">{g.username}</Link>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-foreground/75">
                  {g.item === null && g.targetType !== "user" ? <Tx en="This content has already been removed." /> : null}
                </p>
                {summary}
                <div className="mt-3">
                  <ModerationActions
                    targetType={g.targetType}
                    targetId={g.targetId}
                    actions={g.targetType === "user" ? [{ action: "dismiss", label: "Dismiss reports", tone: "neutral" }, { action: "suspend", label: "Suspend", tone: "bad" }] : [{ action: "dismiss", label: "Dismiss reports", tone: "neutral" }]}
                  />
                </div>
              </article>
            )}
          </li>
        );
      })}
    </ul>
  );
}

async function Pending({ supabase }: { supabase: Db }) {
  const items = await fetchAllByStatus(supabase, ["pending"]);
  if (items.length === 0) return empty("Nothing is waiting for approval.");
  return (
    <ul className="flex flex-col gap-4">
      {items.map((i) => (
        <li key={`${i.type}:${i.id}`}>
          <ModItemCard item={i} actions={PENDING_ACTIONS} />
        </li>
      ))}
    </ul>
  );
}

async function Hidden({ supabase }: { supabase: Db }) {
  const items = await fetchAllByStatus(supabase, ["hidden", "rejected"]);
  if (items.length === 0) return empty("Nothing is hidden or rejected.");
  return (
    <ul className="flex flex-col gap-4">
      {items.map((i) => (
        <li key={`${i.type}:${i.id}`}>
          <ModItemCard item={i} actions={HIDDEN_ACTIONS} />
        </li>
      ))}
    </ul>
  );
}

async function Suspended({ supabase }: { supabase: Db }) {
  const rows = await fetchSuspensions(supabase);
  if (rows.length === 0) return empty("No one is suspended.");
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const over = r.ended;
        return (
          <li key={r.userId} className="rounded-2xl border border-glass-border bg-panel/70 p-4">
            <p className="text-sm font-semibold text-foreground">
              <Link href={`/community/u/${r.username}`} className="underline-offset-2 hover:text-azure hover:underline">{r.username}</Link>
              <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${over ? "bg-white/10 text-foreground/80" : "bg-sakura/15 text-sakura"}`}>
                <Tx en={over ? "Ended" : "Suspended"} />
              </span>
            </p>
            <p className="mt-1 text-xs text-foreground/80">
              <Tx en="Since" /> <LocalDate iso={r.suspendedAt} /> · {r.until ? <><Tx en="until" /> <LocalDate iso={r.until} /></> : <Tx en="Until lifted" />}
            </p>
            {r.reason && <p className="mt-1 break-words text-sm text-foreground/90">{r.reason}</p>}
            <div className="mt-3">
              <ModerationActions targetType="user" targetId={r.userId} actions={[{ action: "unsuspend", label: over ? "Remove from list" : "Lift suspension", tone: "good" }]} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function Log({ supabase }: { supabase: Db }) {
  const rows = await fetchLog(supabase);
  if (rows.length === 0) return empty("No moderation activity yet.");
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-glass-border bg-panel/60 px-4 py-3 text-sm text-foreground/90">
          <span className="font-semibold text-foreground">{r.moderator}</span> · <span className="text-lilac">{r.action}</span> · <Tx en={TARGET_LABEL[r.targetType as keyof typeof TARGET_LABEL] ?? r.targetType} />
          <span className="ml-2 text-xs text-foreground/70">
            <LocalDate iso={r.createdAt} />
          </span>
          {r.note && <p className="mt-0.5 break-words text-xs text-foreground/80">{r.note}</p>}
        </li>
      ))}
    </ul>
  );
}
