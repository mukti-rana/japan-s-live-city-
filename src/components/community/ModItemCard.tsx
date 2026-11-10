import Link from "next/link";
import { ExternalLink } from "lucide-react";
import LocalDate from "@/components/community/LocalDate";
import ModerationActions, { type ActionSpec } from "@/components/community/ModerationActions";
import Stars from "@/components/community/Stars";
import Tx from "@/components/i18n/Tx";
import type { ModItem } from "@/lib/community/adminQuery";
import { TARGET_LABEL } from "@/lib/community/moderation";
import { photoUrl } from "@/lib/community/photos";

const STATUS_TONE: Record<string, string> = {
  published: "bg-mint/15 text-mint",
  pending: "bg-gold/15 text-gold",
  hidden: "bg-white/10 text-foreground/80",
  rejected: "bg-sakura/15 text-sakura",
};

// One piece of content in a moderation list: what it is, who wrote it, a
// preview of the words (or the first photo), and the buttons that apply.
export default function ModItemCard({ item, actions, children }: { item: ModItem; actions: ActionSpec[]; children?: React.ReactNode }) {
  const thumb = item.thumbPath ? photoUrl(item.thumbPath) : null;
  return (
    <article className="rounded-2xl border border-glass-border bg-panel/70 p-4 backdrop-blur-xl">
      <div className="flex gap-3">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" decoding="async" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-lilac/40 bg-lilac/10 px-2.5 py-0.5 font-medium text-lilac">
              <Tx en={TARGET_LABEL[item.type]} />
            </span>
            <span className={`rounded-full px-2.5 py-0.5 font-medium ${STATUS_TONE[item.status] ?? STATUS_TONE.hidden}`}>
              <Tx en={item.status === "published" ? "Published" : item.status === "pending" ? "Waiting for approval" : item.status === "hidden" ? "Hidden" : "Rejected"} />
            </span>
            {item.rating !== null && <Stars value={item.rating} size={13} label={`${item.rating} / 5`} />}
            <span className="text-foreground/70">
              <Link href={`/community/u/${item.author}`} className="rounded underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {item.author}
              </Link>
              {" · "}
              <LocalDate iso={item.createdAt} />
            </span>
          </div>
          {item.title && <h3 className="mt-1.5 text-base font-semibold text-foreground">{item.title}</h3>}
          {item.excerpt && <p className="mt-1 whitespace-pre-line break-words text-sm text-foreground/90">{item.excerpt}</p>}
          <Link href={item.href} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 rounded text-xs font-medium text-azure underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Tx en="Open in a new tab" />
            <ExternalLink size={11} aria-hidden="true" />
          </Link>
        </div>
      </div>
      {children}
      <div className="mt-3">
        <ModerationActions targetType={item.type} targetId={item.id} actions={actions} />
      </div>
    </article>
  );
}
