import { getWeather } from "@/lib/services/weather";
import { parseCoordinates } from "@/lib/geo/coordinates";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";

// Thin wrapper so the client (which only has geolocation coordinates, not
// a Server Component context) can reuse the same real Open-Meteo weather
// service already used server-side elsewhere in the app.
//
// Protected against abuse: coordinates must be well-formed and are ROUNDED (about 1 km) so nearby visitors share one
// cached answer and made-up coordinates cannot fan out into endless weather-service calls; each address gets a modest
// allowance; and the answer may be cached by the CDN for ten minutes.
const limiter = createRateLimiter();
const ALLOWANCE = { perMinute: 20, perHour: 200 };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const at = parseCoordinates(searchParams.get("lat"), searchParams.get("lon"));
  if (!at) return Response.json({ error: "Invalid coordinates." }, { status: 400 });

  const wait = limiter.take(`weather:${clientIp(req.headers)}`, ALLOWANCE);
  if (wait > 0) return Response.json({ error: "Too many weather requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(wait) } });

  try {
    const weather = await getWeather(at.lat, at.lon);
    return Response.json(weather, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } });
  } catch {
    return Response.json({ error: "Weather lookup failed." }, { status: 502 });
  }
}
