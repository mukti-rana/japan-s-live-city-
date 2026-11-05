import { suggest } from "@/lib/explore/catalogue";
import { isLanguageCode } from "@/lib/i18n/languages";

export const runtime = "nodejs";

// Search suggestions: places, cities and prefectures that start with (or
// contain) what the visitor has typed.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lang = params.get("lang") ?? "en";
  const q = (params.get("q") ?? "").slice(0, 60);
  return Response.json({ suggestions: suggest(q, isLanguageCode(lang) ? lang : "en") }, { headers: { "Cache-Control": "public, max-age=300" } });
}
