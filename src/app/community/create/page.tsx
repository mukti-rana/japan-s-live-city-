import type { Metadata } from "next";
import Link from "next/link";
import { Camera, CalendarDays, Megaphone, Tag, Users } from "lucide-react";
import ListingsHeader from "@/components/community/listings/ListingsHeader";
import Tx from "@/components/i18n/Tx";

export const metadata: Metadata = {
  title: "Publish — Community — Live City Japan",
  description: "Publish an event, an announcement, a business offer or a community activity.",
  robots: { index: false, follow: false },
};

const CHOICES = [
  { href: "/community/create/event", Icon: CalendarDays, title: "Event", body: "A festival, concert, market, class or anything with a date and a place.", tint: "#ffb74d" },
  { href: "/community/create/announcement", Icon: Megaphone, title: "Announcement", body: "News for the community: a closure, a notice, a change or something people should know.", tint: "#7dd3fc" },
  { href: "/community/create/promotion", Icon: Tag, title: "Business offer", body: "A deal or a new menu from a shop, restaurant or service.", tint: "#ff8fb1" },
  { href: "/community/create/activity", Icon: Users, title: "Community activity", body: "A clean-up, a meet-up or a volunteering day, open to all.", tint: "#86efac" },
  { href: "/community/new", Icon: Camera, title: "Photo post", body: "Share a photo and your experience of a place in Japan.", tint: "#c4b5fd" },
] as const;

// What would you like to publish? Each choice opens its own form.
export default function CreateChooserPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 pb-10">
      <ListingsHeader section="happening" title="Publish something" intro="Choose what you would like to share with the community." />
      <ul className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map(({ href, Icon, title, body, tint }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full items-start gap-4 rounded-3xl border border-white/12 p-5 transition-colors hover:border-white/35 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15" style={{ color: tint }}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-semibold text-foreground">
                  <Tx en={title} />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-foreground/70">
                  <Tx en={body} />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
