import { eventsQueryFromParams, queryEvents } from "@/lib/events/query";

export const runtime = "nodejs";

// One endpoint for the Events tab and the Home "Events Near You" section.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const result = await queryEvents(eventsQueryFromParams(searchParams));
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  } catch {
    return Response.json({ error: "Events are unavailable right now." }, { status: 503 });
  }
}
