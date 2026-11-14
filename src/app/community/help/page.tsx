import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HandHeart, HelpCircle, MessageSquareText } from "lucide-react";
import CommunityHero from "@/components/community/CommunityHero";
import CommunityTabs from "@/components/community/CommunityTabs";
import QuestionCard from "@/components/community/QuestionCard";
import Unavailable from "@/components/community/Unavailable";
import Tx from "@/components/i18n/Tx";
import { fetchQuestions } from "@/lib/community/discussionQuery";
import { publicClient } from "@/lib/community/queries";

export const metadata: Metadata = {
  title: "Need Help? — Community",
  description: "Have a question about Japan? Ask the community. Know the answer? Help someone out.",
  alternates: { canonical: "/community/help" },
};

const LIST = 6;
const card = "group flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-cm-card p-5 transition-colors hover:border-white/20 sm:p-6";
const primary = "inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const secondary = "inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-semibold text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";

// "Need Help?": ask the community, or answer someone else. Questions are the
// real ones from the database; nothing here is made up.
export default async function NeedHelpPage() {
  const client = publicClient();
  const base = { sort: "latest" as const, page: 1 };
  const [waiting, popular] = client
    ? await Promise.all([fetchQuestions(client, { ...base, sort: "unanswered" }, null, LIST), fetchQuestions(client, { ...base, sort: "answers" }, null, LIST)])
    : [null, null];
  const unavailable = !client || waiting === null || popular === null;
  const answered = popular?.questions.filter((q) => q.answerCount > 0) ?? [];
  const nothing = !unavailable && waiting.questions.length === 0 && answered.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8">
      <CommunityTabs active="help" />

      <CommunityHero>
        <h1 className="text-foreground">
          <Tx en="Need Help?" />
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/70 sm:text-base">
          <Tx en="Have a question about Japan? Ask the community. Know the answer? Help someone out." />
        </p>
      </CommunityHero>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="need-h" className={card}>
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-azure">
            <HelpCircle size={22} />
          </span>
          <div>
            <h2 id="need-h" className="text-xl font-semibold tracking-tight text-foreground">
              <Tx en="I Need Help" />
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
              <Tx en="Ask about a place, a city or anything about life and travel in Japan. People who have been there will answer." />
            </p>
          </div>
          <Link href="/community/questions/new" className={`${primary} mt-auto w-fit`}>
            <Tx en="Ask a question" />
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="can-h" className={card}>
          <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lilac">
            <HandHeart size={22} />
          </span>
          <div>
            <h2 id="can-h" className="text-xl font-semibold tracking-tight text-foreground">
              <Tx en="I Can Help" />
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
              <Tx en="Read questions from other members, share what you know, and mark the answers that helped." />
            </p>
          </div>
          <Link href="/community/questions?sort=unanswered" className={`${secondary} mt-auto w-fit`}>
            <Tx en="Answer questions" />
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      </div>

      <section aria-labelledby="know-h" className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-3">
          <h2 id="know-h" className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            <Tx en="Want to know something?" />
          </h2>
          <Link href="/community/questions" className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-lg px-1 text-sm font-medium text-foreground/75 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="All questions" />
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {unavailable ? (
          <Unavailable reason={client ? "error" : "not_configured"} />
        ) : nothing ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-cm-surface px-5 py-12 text-center">
            <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <MessageSquareText size={22} className="text-azure" />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              <Tx en="No questions yet. Be the first to ask." />
            </h3>
            <Link href="/community/questions/new" className={`${primary} mt-5`}>
              <Tx en="Ask a question" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {waiting.questions.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground/80">
                  <Tx en="Waiting for an answer" />
                </h3>
                <ul className="flex flex-col gap-3">
                  {waiting.questions.map((q) => (
                    <li key={q.id}>
                      <QuestionCard q={q} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {answered.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground/80">
                  <Tx en="Popular questions" />
                </h3>
                <ul className="flex flex-col gap-3">
                  {answered.map((q) => (
                    <li key={q.id}>
                      <QuestionCard q={q} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
