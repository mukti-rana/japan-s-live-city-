import { getDestination } from "@/lib/explore/catalogue";

export const runtime = "nodejs";

interface WikiImage {
  url: string;
  thumb: string;
  page: string;
  author: string | null;
  license: string | null;
  title: string;
}

// More photographs of a place, taken from its own Wikipedia article (the
// images that article uses, all on Wikimedia Commons with their licences).
// Free and keyless; cached for a day. Logos, flags, maps and icons are left out.
const SKIP = /logo|icon|flag|symbol|map|locator|commons-|wikimedia|question|edit-|ambox|portal|signature|seal|emblem|diagram|plan\b|\.svg$/i;

const stripTags = (s: string | undefined) => (s ? s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || null : null);

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^Q\d{1,12}$/.test(id)) return Response.json({ images: [] }, { status: 400 });
  const place = getDestination(id);
  const wiki = place?.abouts.en?.url ?? place?.abouts.ja?.url;
  if (!wiki) return Response.json({ images: [] });

  const host = new URL(wiki).host;
  const title = decodeURIComponent(new URL(wiki).pathname.replace("/wiki/", "")).replace(/_/g, " ");
  const api =
    `https://${host}/w/api.php?action=query&format=json&generator=images&titles=${encodeURIComponent(title)}` +
    `&gimlimit=40&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=900&iiextmetadatafilter=Artist|LicenseShortName`;
  try {
    const res = await fetch(api, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000), headers: { "User-Agent": "LiveCityJapan/1.0 (educational project; gallery)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; imageinfo?: { thumburl?: string; url: string; width: number; height: number; mime: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] }> } };
    const out: WikiImage[] = [];
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png)$/.test(info.mime) || info.width < 700 || info.height < 400 || SKIP.test(page.title)) continue;
      // The page's own header photo is already shown large.
      if (place?.image && info.descriptionurl === place.image.page) continue;
      out.push({
        url: info.thumburl ?? info.url,
        thumb: info.thumburl ?? info.url,
        page: info.descriptionurl,
        author: stripTags(info.extmetadata?.Artist?.value),
        license: stripTags(info.extmetadata?.LicenseShortName?.value),
        title: page.title.replace(/^File:/, "").replace(/\.\w+$/, ""),
      });
    }
    return Response.json({ images: out.slice(0, 8) }, { headers: { "Cache-Control": "public, s-maxage=86400" } });
  } catch {
    return Response.json({ images: [] });
  }
}
