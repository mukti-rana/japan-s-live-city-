import { queryFromParams, queryNews } from "@/lib/news/query";

export const runtime = "nodejs";

// One endpoint for the News tab and the Home "Latest News Near You" section,
// so both always agree. Takes filters and a place *name* — never coordinates.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const result = await queryNews(queryFromParams(searchParams));
    return Response.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return Response.json({ error: "News is unavailable right now." }, { status: 503 });
  }
}
