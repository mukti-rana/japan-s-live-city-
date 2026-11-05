import { getDestination } from "@/lib/explore/catalogue";
import type { Destination } from "@/lib/explore/types";

export const runtime = "nodejs";

// Looks up specific destinations by id (for the trip list and saved places).
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^Q\d{1,12}$/.test(id))
    .slice(0, 40);
  const items = ids.map((id) => getDestination(id)).filter((d): d is Destination => d !== null);
  return Response.json({ items, total: items.length, nextOffset: null }, { headers: { "Cache-Control": "private, max-age=60" } });
}
