export const runtime = "nodejs";

const cache = new Map<string, { embeddable: boolean; at: number }>();
const TTL = 6 * 60 * 60 * 1000;

// Publishers can switch embedding off for a video. YouTube's public oEmbed
// endpoint answers 200 only when a video may be embedded, so we ask before
// showing a player and fall back to "Watch at source" when it can't be.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[\w-]{11}$/.test(id)) return Response.json({ error: "Invalid video id." }, { status: 400 });

  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return Response.json({ embeddable: hit.embeddable });

  let embeddable = false;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { signal: AbortSignal.timeout(5000), cache: "no-store" },
    );
    embeddable = res.ok;
  } catch {
    // Can't tell — treat as not embeddable so the viewer still gets a working link.
  }
  cache.set(id, { embeddable, at: Date.now() });
  return Response.json({ embeddable });
}
