import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { UUID_RE } from "@/lib/community/validation";
import type { CommunityPost } from "@/lib/community/types";

export type PostResult =
  | { state: "ready"; post: CommunityPost; status: string; isOwner: boolean; viewerId: string | null }
  | { state: "missing" }
  | { state: "unavailable" };

const SELECT =
  "id,user_id,status,title,caption,area_id,city_label,place_ref,place_label,place_category,category_slug,visit_date,like_count,comment_count,save_count,published_at,created_at," +
  "profiles!community_posts_user_id_fkey(username,avatar_url)," +
  "community_post_images(storage_path,thumb_path,width,height,alt,position)";

interface Row {
  id: string;
  user_id: string;
  status: string;
  title: string;
  caption: string;
  area_id: string;
  city_label: string | null;
  place_ref: string | null;
  place_label: string | null;
  place_category: string | null;
  category_slug: string;
  visit_date: string | null;
  like_count: number;
  comment_count: number;
  save_count: number;
  published_at: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[] | null;
  community_post_images: { storage_path: string; thumb_path: string | null; width: number | null; height: number | null; alt: string | null; position: number }[] | null;
}

// One post for its page. This uses the visitor's own session (not the shared
// public key) so that an author can still open their own post while it waits
// for approval or after it was hidden; everyone else is shown only published
// posts, because Row Level Security in the database decides — not this code.
export const fetchPost = cache(async (id: string): Promise<PostResult> => {
  if (!isSupabaseConfigured) return { state: "unavailable" };
  if (!UUID_RE.test(id)) return { state: "missing" };
  try {
    const supabase = await createClient();
    const [{ data, error }, { data: auth }] = await Promise.all([supabase.from("community_posts").select(SELECT).eq("id", id).maybeSingle(), supabase.auth.getUser()]);
    if (error) return { state: "unavailable" };
    if (!data) return { state: "missing" };
    const r = data as unknown as Row;
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      state: "ready",
      status: r.status,
      isOwner: auth.user?.id === r.user_id,
      viewerId: auth.user?.id ?? null,
      post: {
        id: r.id,
        title: r.title,
        caption: r.caption,
        areaId: r.area_id,
        cityLabel: r.city_label,
        placeRef: r.place_ref,
        placeLabel: r.place_label,
        placeCategory: r.place_category,
        categorySlug: r.category_slug,
        visitDate: r.visit_date,
        likeCount: r.like_count,
        commentCount: r.comment_count,
        saveCount: r.save_count,
        publishedAt: r.published_at ?? r.created_at,
        author: { username: profile?.username ?? "traveler", avatarUrl: profile?.avatar_url ?? null },
        images: (r.community_post_images ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((i) => ({ path: i.storage_path, thumbPath: i.thumb_path, width: i.width, height: i.height, alt: i.alt })),
      },
    };
  } catch {
    return { state: "unavailable" };
  }
});
