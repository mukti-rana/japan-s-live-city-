// Straight-line distance and the centre point of each prefecture (its capital
// city). A visitor's city is only ever a *name*; distances are measured from
// the centre of that city or prefecture — never from exact coordinates.

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Roughly where Japan is — used to reject obviously wrong coordinates.
export function inJapan(lat: number, lon: number): boolean {
  return lat >= 20 && lat <= 46 && lon >= 122 && lon <= 154;
}

export const PREFECTURE_CENTER: Record<string, [number, number]> = {
  hokkaido: [43.0642, 141.3469],
  aomori: [40.8244, 140.74],
  iwate: [39.7036, 141.1527],
  miyagi: [38.2688, 140.8721],
  akita: [39.7186, 140.1024],
  yamagata: [38.2404, 140.3633],
  fukushima: [37.7503, 140.4676],
  ibaraki: [36.3418, 140.4468],
  tochigi: [36.5657, 139.8836],
  gunma: [36.3912, 139.0608],
  saitama: [35.857, 139.649],
  chiba: [35.6047, 140.1233],
  tokyo: [35.6895, 139.6917],
  kanagawa: [35.4478, 139.6425],
  niigata: [37.9026, 139.0232],
  toyama: [36.6953, 137.2113],
  ishikawa: [36.5947, 136.6256],
  fukui: [36.0652, 136.2216],
  yamanashi: [35.6642, 138.5684],
  nagano: [36.6513, 138.181],
  gifu: [35.3912, 136.7223],
  shizuoka: [34.9769, 138.3831],
  aichi: [35.1802, 136.9066],
  mie: [34.7303, 136.5086],
  shiga: [35.0045, 135.8686],
  kyoto: [35.0116, 135.7681],
  osaka: [34.6937, 135.5023],
  hyogo: [34.6913, 135.183],
  nara: [34.6851, 135.8049],
  wakayama: [34.2261, 135.1675],
  tottori: [35.5039, 134.2377],
  shimane: [35.4723, 133.0505],
  okayama: [34.6618, 133.9344],
  hiroshima: [34.3853, 132.4553],
  yamaguchi: [34.1861, 131.4706],
  tokushima: [34.0658, 134.5593],
  kagawa: [34.3401, 134.0434],
  ehime: [33.8416, 132.7657],
  kochi: [33.5597, 133.5311],
  fukuoka: [33.5904, 130.4017],
  saga: [33.2635, 130.3009],
  nagasaki: [32.7503, 129.8777],
  kumamoto: [32.7898, 130.7417],
  oita: [33.2382, 131.6126],
  miyazaki: [31.9111, 131.4239],
  kagoshima: [31.5602, 130.5581],
  okinawa: [26.2124, 127.6809],
};
