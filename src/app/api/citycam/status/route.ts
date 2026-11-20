import { CITY_CAMS } from "@/lib/data/cityCams";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whether each camera's YouTube stream is live right now, read from the stream's own public watch page (the same information YouTube shows on it:
// the page says whether the broadcast is on air). Only what the page states is reported:
//   live     the page says the broadcast is on air now
//   offline  the page says it is not (ended, or not started)
//   unknown  the page could not be read, or does not say (for example it asks for a sign-in): nothing is guessed
// Answers are kept for a minute so the pages are not asked more often than that, however many people are watching. No visitor information is
// sent anywhere: the request is the server's own.
type State = "live" | "offline" | "unknown";
interface Answer {
  state: State;
  checkedAt: string;
}

const TTL = 60_000;
const cache = new Map<string, { at: number; answer: Answer }>();

async function check(videoId: string): Promise<Answer> {
  const checkedAt = new Date().toISOString();
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LiveCityJapan/1.0; stream status check)", "Accept-Language": "en" },
    });
    if (!res.ok) return { state: "unknown", checkedAt };
    const html = await res.text();
    // It must be this video's page, and carry the broadcast details.
    if (!html.includes(`"videoId":"${videoId}"`)) return { state: "unknown", checkedAt };
    const m = /"liveBroadcastDetails":\{[^}]*?"isLiveNow":(true|false)/.exec(html);
    if (!m) return { state: "unknown", checkedAt };
    return { state: m[1] === "true" ? "live" : "offline", checkedAt };
  } catch {
    return { state: "unknown", checkedAt };
  }
}

export async function GET() {
  const now = Date.now();
  const entries = await Promise.all(
    Object.entries(CITY_CAMS).map(async ([slug, cam]) => {
      const hit = cache.get(cam.videoId);
      if (hit && now - hit.at < TTL) return [slug, hit.answer] as const;
      const answer = await check(cam.videoId);
      // A failed read does not replace a good answer from the last few minutes.
      if (answer.state === "unknown" && hit && now - hit.at < TTL * 5) return [slug, hit.answer] as const;
      cache.set(cam.videoId, { at: now, answer });
      return [slug, answer] as const;
    }),
  );
  return Response.json({ cams: Object.fromEntries(entries) }, { headers: { "Cache-Control": "no-store" } });
}
