// Reading a latitude/longitude pair from an address (query string) safely, and rounding it.
//
// Rounding to 2 decimals (about 1 km) is plenty for a weather forecast, and it matters twice: it means far fewer
// distinct places can be asked about (so people near each other share one cached answer and a flood of made-up
// coordinates cannot fill the cache or the weather service's quota), and it stops the server from handling a
// visitor's exact position.

const NUMBER = /^-?\d{1,3}(\.\d{1,12})?$/;

export function roundCoordinate(n: number): number {
  return Math.round(n * 100) / 100;
}

// Both values must be present and look like plain decimal numbers in range: no blanks (which used to read as 0),
// no exponents, no "NaN"/"Infinity", no hex. Returns the rounded pair, or null.
export function parseCoordinates(latRaw: string | null, lonRaw: string | null): { lat: number; lon: number } | null {
  if (latRaw === null || lonRaw === null || !NUMBER.test(latRaw) || !NUMBER.test(lonRaw)) return null;
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat: roundCoordinate(lat) + 0, lon: roundCoordinate(lon) + 0 }; // "+ 0" turns -0 into 0
}
