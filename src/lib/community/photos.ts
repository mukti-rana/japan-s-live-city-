import { supabaseUrl } from "@/lib/supabase/env";

// Photos live in the public 'community-photos' Storage bucket (created in
// phase 2). The database holds only the file's path; this turns it into a
// URL. Thumbnails are used in feeds so a page never loads full-size photos.
const BUCKET = "community-photos";

export function photoUrl(path: string): string | null {
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
