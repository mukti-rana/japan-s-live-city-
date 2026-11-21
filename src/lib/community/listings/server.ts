import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSameOrigin, json } from "@/lib/community/http";
import { logProblem, classifyError } from "@/lib/community/queries";
import type { ParsedListing } from "@/lib/community/listings/validation";

// Shared by the listing API routes. Everything goes through the signed-in person's own session, so Row Level Security and the database's own
// functions decide what is allowed; this code only checks the request, never trusts who or what the browser claims, and explains problems kindly.

export type Gate = { ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: Response };

export async function requireUser(request: Request): Promise<Gate> {
  if (!isSameOrigin(request)) return { ok: false, response: json({ error: "This request isn't allowed." }, 403) };
  if (!isSupabaseConfigured) return { ok: false, response: json({ error: "Publishing isn't available right now." }, 503) };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, response: json({ error: "Please sign in to publish." }, 401) };
  return { ok: true, supabase, user: auth.user };
}

// A database error → a response. The database's own sentences (code P0001) are written for people and are passed on; anything else is
// logged and answered generally.
export function fail(where: string, error: { code?: string | null; message?: string | null }): Response {
  if (error.code === "P0001") {
    const limited = /too quickly/i.test(error.message ?? "");
    return json({ error: error.message }, limited ? 429 : 422);
  }
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) return json({ error: "You can't do that." }, 403);
  if (error.code === "23505") return json({ error: "That has already been saved." }, 409);
  logProblem(where, classifyError(error), error);
  return json({ error: classifyError(error) === "not_set_up" ? "This part of the community isn't set up yet." : "That didn't work. Please try again." }, classifyError(error) === "not_set_up" ? 503 : 500);
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Replaces a listing's photographs and video link with these. Photos must be ones this person's upload step accepted (the database checks
// that too). Everything is checked before anything is removed.
export async function writeMedia(supabase: SupabaseClient, listingId: string, userId: string, parsed: Pick<ParsedListing, "images" | "videoUrl">): Promise<Response | null> {
  let uploads: { path: string; thumb_path: string; width: number; height: number }[] = [];
  if (parsed.images.length) {
    if (parsed.images.some((p) => !p.startsWith(`${userId}/`))) return json({ error: "Some photos could not be found. Please add them again." }, 400);
    const { data, error } = await supabase.from("community_uploads").select("path,thumb_path,width,height").in("path", parsed.images);
    if (error) return fail("listing uploads", error);
    uploads = data ?? [];
    if (uploads.length !== parsed.images.length) return json({ error: "Some photos could not be found. Please add them again." }, 400);
  }
  const byPath = new Map(uploads.map((u) => [u.path, u]));

  const { data: before } = await supabase.from("community_listing_media").select("kind,storage_path,thumb_path,width,height,alt,video_url,position").eq("listing_id", listingId);
  const del = await supabase.from("community_listing_media").delete().eq("listing_id", listingId);
  if (del.error) return fail("listing media", del.error);

  const rows = [
    ...parsed.images.map((path, i) => {
      const u = byPath.get(path)!;
      return { listing_id: listingId, kind: "image", storage_path: u.path, thumb_path: u.thumb_path, width: u.width, height: u.height, position: i };
    }),
    ...(parsed.videoUrl ? [{ listing_id: listingId, kind: "video", video_url: parsed.videoUrl, position: parsed.images.length }] : []),
  ];
  if (rows.length === 0) return null;
  const ins = await supabase.from("community_listing_media").insert(rows);
  if (ins.error) {
    // Put back what was there, so a failed edit never leaves a listing without its photographs.
    if (before?.length) await supabase.from("community_listing_media").insert(before.map((b) => ({ listing_id: listingId, ...b })));
    return fail("listing media", ins.error);
  }
  return null;
}
