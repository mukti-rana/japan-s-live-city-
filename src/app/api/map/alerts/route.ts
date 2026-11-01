import { getOfficialAlerts, type OfficialAlert } from "@/lib/emergency/disaster";
import { MAP_CITIES } from "@/lib/map/cities";

export const runtime = "nodejs";

// Official JMA information for the map's alert layer. Warnings and advisories
// are read per prefecture (each city's own); earthquake, tsunami and typhoon
// reports are national, so they are returned once and not tied to a city.
// Nothing here is invented: a prefecture JMA could not be read for is listed
// in `unavailable`, and anything stale is dropped by the shared alerts code.
export async function GET() {
  const prefectures = [...new Set(MAP_CITIES.map((c) => c.prefectureId))];
  const results = await Promise.all(prefectures.map((id) => getOfficialAlerts(id).catch(() => null)));

  const byPrefecture: Record<string, OfficialAlert[]> = {};
  const unavailable: string[] = [];
  const national = new Map<string, OfficialAlert>();
  const notes = new Set<string>();

  results.forEach((result, i) => {
    const id = prefectures[i];
    if (!result) {
      unavailable.push(id);
      return;
    }
    const warningsOk = result.sources.find((s) => s.name.startsWith("JMA warnings"))?.ok;
    if (!warningsOk) unavailable.push(id);
    byPrefecture[id] = result.alerts.filter((a) => a.kind === "warning");
    for (const a of result.alerts) if (a.kind !== "warning") national.set(a.id, a);
    result.notes.forEach((n) => notes.add(n));
  });

  if (results.every((r) => r === null)) {
    return Response.json({ error: "Alerts are unavailable." }, { status: 503 });
  }

  return Response.json(
    { byPrefecture, national: [...national.values()], unavailable, notes: [...notes], checkedAt: Date.now() },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
