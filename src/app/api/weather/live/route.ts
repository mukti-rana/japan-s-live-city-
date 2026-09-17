import { getWeather } from "@/lib/services/weather";

// Thin wrapper so the client (which only has geolocation coordinates, not
// a Server Component context) can reuse the same real Open-Meteo weather
// service already used server-side elsewhere in the app.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  try {
    const weather = await getWeather(lat, lon);
    return Response.json(weather);
  } catch {
    return Response.json({ error: "Weather lookup failed." }, { status: 502 });
  }
}
