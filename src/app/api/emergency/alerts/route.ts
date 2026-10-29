import { getOfficialAlerts } from "@/lib/emergency/disaster";
import { PREFECTURES } from "@/lib/news/places";

export const runtime = "nodejs";

// Official JMA alerts. Takes only a prefecture id — never a position.
export async function GET(request: Request) {
  const pref = new URL(request.url).searchParams.get("pref");
  const prefectureId = pref && PREFECTURES.some((p) => p.id === pref) ? pref : null;
  try {
    const result = await getOfficialAlerts(prefectureId);
    return Response.json(result, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ error: "Alerts are unavailable." }, { status: 503 });
  }
}
