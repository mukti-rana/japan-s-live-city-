import { parseCoordinates } from "@/lib/geo/coordinates";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";

// An APPROXIMATE position for the visitor, used only when their browser will not share the exact one (they pressed "Block",
// location is off on the device, or the device has none). The host (Vercel) works out a rough city from the network address
// and passes it to us in request headers; we hand it straight back to the same visitor. Nothing is sent to any other
// company and nothing is stored or logged. It can be wrong (mobile networks often resolve to a big city), so the page
// always labels it "approximate" and offers the exact position and a city list.
//
// The answer is different for every visitor, so it must never be cached or shared: "private, no-store".
const limiter = createRateLimiter();
const ALLOWANCE = { perMinute: 20, perHour: 120 };
const NONE = () => Response.json({ available: false }, { headers: { "Cache-Control": "private, no-store" } });

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  if (limiter.take(`geo:${clientIp(req.headers)}`, ALLOWANCE) > 0) {
    return Response.json({ available: false }, { status: 429, headers: { "Cache-Control": "private, no-store", "Retry-After": "30" } });
  }
  const h = req.headers;
  let city = "";
  try {
    city = decodeURIComponent(h.get("x-vercel-ip-city") ?? "").trim();
  } catch {
    return NONE();
  }
  const at = parseCoordinates(h.get("x-vercel-ip-latitude"), h.get("x-vercel-ip-longitude"));
  if (!city || city.length > 80 || /[\u0000-\u001F<>]/.test(city) || !at) return NONE();

  const code = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  let country: string | null = null;
  if (/^[A-Z]{2}$/.test(code)) {
    try {
      country = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? null;
    } catch {
      country = null;
    }
  }
  return Response.json({ available: true, city, country, lat: at.lat, lon: at.lon }, { headers: { "Cache-Control": "private, no-store" } });
}
