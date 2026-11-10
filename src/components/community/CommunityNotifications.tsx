"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ThumbsUp, Heart, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/supabase/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/lib/i18n/inline";
import LocalDate from "@/components/community/LocalDate";

export interface CommunityNotification {
  id: string;
  kind: string;
  count: number;
  linkPath: string;
  readAt: string | null;
  createdAt: string;
  actor: string | null;
}

interface Row {
  id: string;
  kind: string;
  count: number;
  link_path: string;
  read_at: string | null;
  created_at: string;
  profiles: { username: string } | { username: string }[] | null;
}

// The signed-in person's community notifications: loaded when the page opens,
// refreshed every minute and when the bell opens, and marked read (only their
// own can be). There is no live connection: nothing is pushed to the device.
export function useCommunityNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<CommunityNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await createClient()
      .from("community_notifications")
      .select("id,kind,count,link_path,read_at,created_at,profiles:actor_id(username)")
      .order("created_at", { ascending: false })
      .limit(15);
    if (!data) return;
    setItems(
      (data as unknown as Row[]).map((r) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return { id: r.id, kind: r.kind, count: r.count, linkPath: r.link_path, readAt: r.read_at, createdAt: r.created_at, actor: p?.username ?? null };
      }),
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const { error } = await createClient().from("community_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (!error) await refresh();
  }, [user, refresh]);

  // Signed out (or configuration missing): nothing to show, whatever was loaded before.
  const visible = user ? items : [];
  return { items: visible, unread: visible.filter((n) => !n.readAt).length, refresh, markAllRead };
}

const ICON: Record<string, typeof Heart> = { post_like: Heart, post_comment: MessageCircle, comment_reply: MessageCircle, answer_reply: MessageCircle, question_answered: HelpCircle, answer_helpful: ThumbsUp, review_helpful: ThumbsUp };

export function CommunityNotificationList({ items, onNavigate }: { items: CommunityNotification[]; onNavigate: () => void }) {
  const tr = useTranslate();

  const text = (n: CommunityNotification): string => {
    const name = n.actor ?? tr("Someone");
    const others = n.count - 1;
    switch (n.kind) {
      case "post_like":
        return others > 0 ? tr("{name} and {n} others liked your post").replace("{name}", name).replace("{n}", String(others)) : tr("{name} liked your post").replace("{name}", name);
      case "post_comment":
        return tr("{name} commented on your post").replace("{name}", name);
      case "comment_reply":
        return tr("{name} replied to your comment").replace("{name}", name);
      case "answer_reply":
        return tr("{name} replied to your answer").replace("{name}", name);
      case "question_answered":
        return tr("{name} answered your question").replace("{name}", name);
      case "answer_helpful":
        return n.count > 1 ? tr("{n} people found your answer helpful").replace("{n}", String(n.count)) : tr("{name} found your answer helpful").replace("{name}", name);
      case "review_helpful":
        return n.count > 1 ? tr("{n} people found your review helpful").replace("{n}", String(n.count)) : tr("{name} found your review helpful").replace("{name}", name);
      default:
        return tr("New activity in the community");
    }
  };

  return (
    <ul className="max-h-72 overflow-y-auto">
      {items.map((n) => {
        const Icon = ICON[n.kind] ?? MessageCircle;
        const unread = !n.readAt;
        return (
          <li key={n.id}>
            <Link href={n.linkPath} onClick={onNavigate} className="flex gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-glass-bg-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure">
              <Icon size={16} className={`mt-0.5 shrink-0 ${unread ? "text-sakura" : "text-muted"}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className={`block text-sm ${unread ? "font-medium text-foreground" : "text-foreground/85"}`}>
                  {unread && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sakura align-middle" aria-label={tr("New")} />}
                  {text(n)}
                </span>
                <span className="block text-xs text-muted">
                  <LocalDate iso={n.createdAt} />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
