import Link from "next/link";
import { Pencil } from "lucide-react";
import Avatar from "@/components/community/Avatar";
import LocalDate from "@/components/community/LocalDate";
import Tx from "@/components/i18n/Tx";
import type { CommunityProfile, ProfileStats } from "@/lib/community/types";

// The top of a profile: picture, name, bio, member-since and — if the person
// shows them — their contribution numbers. Private details never appear here
// (no email, nothing from the account itself).
export default function ProfileHeader({ profile, stats, owner }: { profile: CommunityProfile; stats: ProfileStats | null; owner: boolean }) {
  const numbers: { n: number; en: string }[] = stats
    ? [
        { n: stats.posts, en: "Photos shared" },
        { n: stats.reviews, en: "Reviews written" },
        { n: stats.questions, en: "Questions asked" },
        { n: stats.helpfulReceived, en: "Helpful votes received" },
        ...(owner || profile.showVisited ? [{ n: stats.visited, en: "Places visited" }] : []),
      ]
    : [];

  return (
    <header className="rounded-3xl border border-glass-border bg-gradient-to-br from-lilac/10 via-glass-bg to-azure/10 p-5 backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        <Avatar username={profile.username} avatarUrl={profile.avatarUrl} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{profile.displayName ?? profile.username}</h1>
          <p className="text-sm text-foreground/80">
            @{profile.username} · <Tx en="Member since" /> <LocalDate iso={profile.createdAt} />
          </p>
          {profile.bio && <p className="mt-2 max-w-xl whitespace-pre-line break-words text-sm leading-relaxed text-foreground/95">{profile.bio}</p>}
        </div>
        {owner && (
          <Link href="/community/me?tab=profile" className="inline-flex h-10 items-center gap-2 rounded-xl border border-glass-border bg-glass-bg px-4 text-sm font-medium text-foreground transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
            <Pencil size={14} aria-hidden="true" />
            <Tx en="Edit profile" />
          </Link>
        )}
      </div>
      {numbers.length > 0 && (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {numbers.map((s) => (
            <li key={s.en} className="rounded-2xl border border-glass-border bg-black/20 px-4 py-3">
              <p className="text-2xl font-bold tabular-nums text-foreground">{s.n}</p>
              <p className="text-xs text-foreground/80">
                <Tx en={s.en} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
