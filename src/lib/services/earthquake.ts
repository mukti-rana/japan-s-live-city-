// Real live earthquake data from the P2P Quake API — a free, keyless relay
// of official JMA (Japan Meteorological Agency) seismic bulletins.
// https://www.p2pquake.net/en/

const SHINDO_LABELS: Record<number, string> = {
  10: "1",
  20: "2",
  30: "3",
  40: "4",
  45: "5-",
  50: "5+",
  55: "6-",
  60: "6+",
  70: "7",
};

const TSUNAMI_LABELS: Record<string, string> = {
  None: "No tsunami risk",
  Unknown: "Tsunami status unknown",
  Checking: "Checking for tsunami risk",
  NonEffective: "No significant tsunami expected",
  Watch: "Tsunami advisory issued",
  Warning: "Tsunami warning issued",
  MajorWarning: "Major tsunami warning issued",
};

export interface EarthquakeEvent {
  id: string;
  location: string;
  magnitude: number;
  depthKm: number;
  maxIntensity: string;
  tsunami: string;
  tsunamiCode: string;
  time: string;
}

interface P2PQuakeItem {
  id: string;
  earthquake: {
    hypocenter: { name: string; magnitude: number; depth: number };
    maxScale: number;
    domesticTsunami: string;
    time: string;
  };
}

export async function getRecentEarthquakes(limit = 8): Promise<EarthquakeEvent[]> {
  const res = await fetch(
    `https://api.p2pquake.net/v2/history?codes=551&limit=30`,
    { next: { revalidate: 300 } },
  );

  if (!res.ok) {
    throw new Error(`P2P Quake API responded with ${res.status}`);
  }

  const data = (await res.json()) as P2PQuakeItem[];

  return data
    .filter(
      (item) =>
        item.earthquake?.hypocenter?.magnitude > 0 &&
        item.earthquake.maxScale >= 0,
    )
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      location: item.earthquake.hypocenter.name || "Unknown location",
      magnitude: item.earthquake.hypocenter.magnitude,
      depthKm: item.earthquake.hypocenter.depth,
      maxIntensity: SHINDO_LABELS[item.earthquake.maxScale] ?? "—",
      tsunami:
        TSUNAMI_LABELS[item.earthquake.domesticTsunami] ??
        item.earthquake.domesticTsunami,
      tsunamiCode: item.earthquake.domesticTsunami,
      time: item.earthquake.time,
    }));
}
