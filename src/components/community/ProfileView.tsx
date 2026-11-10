import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ThumbsUp } from "lucide-react";
import LocalDate from "@/components/community/LocalDate";
import PostCard from "@/components/community/PostCard";
import ProfileEditor from "@/components/community/ProfileEditor";
import ProfileHeader from "@/components/community/ProfileHeader";
import QuestionCard from "@/components/community/QuestionCard";
import Stars from "@/components/community/Stars";
import VisitedList from "@/components/community/VisitedList";
import Tx from "@/components/i18n/Tx";
import { photoUrl } from "@/lib/community/photos";
import { fetchProfileStats, fetchSavedPlaces, fetchSavedPosts, fetchUserAnswers, fetchUserPosts, fetchUserQuestions, fetchUserReviews, fetchVisited } from "@/lib/community/profileQuery";
import { tabsFor, type ProfileTab } from "@/lib/community/profileTabs";
import type { CommunityProfile } from "@/lib/community/types";
import { getDestination } from "@/lib/explore/catalogue";

const TAB_TEXT: Record<ProfileTab, string> = { posts: "Posts", photos: "Photos", reviews: "Reviews", questions: "Questions", answers: "Answers", visited: "Places visited", saved: "Saved", profile: "Edit profile" };

const STATUS_TEXT: Record<string, string> = { pending: "Waiting for approval", hidden: "Hidden", rejected: "Not approved" };

function Empty({ en }: { en: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-white/20 bg-glass-bg px-4 py-8 text-center text-sm text-foreground/85">
      <Tx en={en} />
    </p>
  );
}

// A person's profile: header, tabs, and the content of the chosen tab. The same
// view serves the public profile and "My contributions"; `owner` adds the
// private tabs (saved places, edit) and the owner's own unpublished items.
export default async function ProfileView({ client, profile, owner, tab, basePath }: { client: SupabaseClient; profile: CommunityProfile; owner: boolean; tab: ProfileTab; basePath: string }) {
  const stats = await fetchProfileStats(client, profile.id);
  const tabs = tabsFor(profile, owner);

  const link = (t: ProfileTab) => `${basePath}${t === "posts" ? "" : `?tab=${t}`}`;
  const chip = (on: boolean) => `inline-flex shrink-0 items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-azure/60 bg-azure/20 text-azure" : "border-glass-border bg-glass-bg text-foreground/85 hover:border-white/30 hover:text-foreground"}`;

  let content: React.ReactNode = null;
  if (tab === "posts" || tab === "photos") {
    const posts = await fetchUserPosts(client, profile.id, owner);
    if (tab === "posts") {
      content = posts.length === 0 ? <Empty en={owner ? "You haven't shared any posts yet." : "No posts yet."} /> : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {posts.map((p) => (
            <div key={p.id}>
              <PostCard post={p} />
            </div>
          ))}
        </div>
      );
    } else {
      const shots = posts.flatMap((p) => p.images.flatMap((img) => {
        const src = photoUrl(img.thumbPath ?? img.path);
        return src ? [{ id: `${p.id}-${img.path}`, src, post: p.id, title: p.title }] : [];
      }));
      content = shots.length === 0 ? <Empty en="No photos yet." /> : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {shots.map((s) => (
            <li key={s.id}>
              <Link href={`/community/post/${s.post}`} className="block aspect-square overflow-hidden rounded-xl border border-glass-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform hover:scale-105" />
              </Link>
            </li>
          ))}
        </ul>
      );
    }
  } else if (tab === "reviews") {
    const reviews = await fetchUserReviews(client, profile.id, owner);
    content = reviews.length === 0 ? <Empty en={owner ? "You haven't written any reviews yet." : "No reviews yet."} /> : (
      <ul className="flex flex-col gap-3">
        {reviews.map((r) => {
          const place = getDestination(r.placeRef);
          return (
            <li key={r.id} className="rounded-2xl border border-glass-border bg-panel/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/community/place/${r.placeRef}#reviews`} className="text-sm font-semibold text-foreground underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                  {place ? place.names.en ?? place.names.ja : r.placeRef}
                </Link>
                <Stars value={r.rating} size={15} label={`${r.rating} / 5`} />
              </div>
              {r.body && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-foreground/90">{r.body}</p>}
              <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-foreground/75">
                <LocalDate iso={r.publishedAt} />
                {owner && r.status !== "published" && STATUS_TEXT[r.status] && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold"><Tx en={STATUS_TEXT[r.status]} /></span>}
              </p>
            </li>
          );
        })}
      </ul>
    );
  } else if (tab === "questions") {
    const questions = await fetchUserQuestions(client, profile.id, owner);
    content = questions.length === 0 ? <Empty en={owner ? "You haven't asked any questions yet." : "No questions yet."} /> : (
      <ul className="flex flex-col gap-3">
        {questions.map((q) => (
          <li key={q.id}>
            <QuestionCard q={q} />
          </li>
        ))}
      </ul>
    );
  } else if (tab === "answers") {
    const answers = await fetchUserAnswers(client, profile.id, owner);
    content = answers.length === 0 ? <Empty en={owner ? "You haven't answered any questions yet." : "No answers yet."} /> : (
      <ul className="flex flex-col gap-3">
        {answers.map((a) => (
          <li key={a.id} className="rounded-2xl border border-glass-border bg-panel/60 p-4">
            {a.question && (
              <Link href={`/community/question/${a.question.id}`} className="text-sm font-semibold text-foreground underline-offset-2 hover:text-azure hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                {a.question.title}
              </Link>
            )}
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-foreground/90">{a.body}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-foreground/75">
              <LocalDate iso={a.createdAt} />
              <span className="inline-flex items-center gap-1">
                <ThumbsUp size={12} aria-hidden="true" />
                {a.helpfulCount} <Tx en="helpful" />
              </span>
              {owner && a.status !== "published" && STATUS_TEXT[a.status] && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold"><Tx en={STATUS_TEXT[a.status]} /></span>}
            </p>
          </li>
        ))}
      </ul>
    );
  } else if (tab === "visited") {
    content = <VisitedList places={await fetchVisited(client, profile.id)} owner={owner} />;
  } else if (tab === "saved") {
    const [savedPosts, savedPlaces] = await Promise.all([fetchSavedPosts(client, profile.id), fetchSavedPlaces(client, profile.id)]);
    content = (
      <div className="flex flex-col gap-8">
        <p className="text-xs text-foreground/75"><Tx en="Only you can see what you have saved." /></p>
        <section aria-labelledby="saved-posts-h" className="flex flex-col gap-3">
          <h2 id="saved-posts-h" className="text-lg font-semibold text-foreground"><Tx en="Saved posts" /></h2>
          {savedPosts.length === 0 ? <Empty en="No saved posts yet." /> : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {savedPosts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </section>
        <section aria-labelledby="saved-places-h" className="flex flex-col gap-3">
          <h2 id="saved-places-h" className="text-lg font-semibold text-foreground"><Tx en="Saved places" /></h2>
          {savedPlaces.length === 0 ? <Empty en="No saved places yet." /> : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {savedPlaces.map((ref) => {
                const place = getDestination(ref);
                return (
                  <li key={ref}>
                    <Link href={`/explore/${ref}`} className="block truncate rounded-2xl border border-glass-border bg-panel/60 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
                      {place ? place.names.en ?? place.names.ja : ref}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  } else if (tab === "profile") {
    content = <ProfileEditor profile={profile} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 pb-10">
      <ProfileHeader profile={profile} stats={stats} owner={owner} />
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => (
          <Link key={t} href={link(t)} className={chip(tab === t)} aria-current={tab === t ? "page" : undefined}>
            <Tx en={TAB_TEXT[t]} />
          </Link>
        ))}
      </nav>
      <section aria-live="polite">{content}</section>
    </div>
  );
}

