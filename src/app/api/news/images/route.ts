import { findArticles } from "@/lib/news/aggregate";
import { enrichImages } from "@/lib/news/images";

export const runtime = "nodejs";

// Resolves the publisher's preview image for a few stories at a time. Takes
// story ids (not arbitrary URLs), so it can only ever read pages of the
// news sources we already list.
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^[\w-]{6,16}$/.test(id))
    .slice(0, 6);
  if (ids.length === 0) return Response.json({});

  const articles = await findArticles(ids);
  const resolved = await enrichImages(articles, 8000);
  const out: Record<string, string | null> = Object.fromEntries(ids.map((id) => [id, null]));
  for (const a of resolved) out[a.id] = a.imageUrl;
  return Response.json(out, { headers: { "Cache-Control": "public, s-maxage=3600" } });
}
