export const runtime = "nodejs";

// Japan's official national holidays, from the Cabinet Office's published
// list (https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html). The file is
// Shift-JIS CSV covering past years and the coming year. Cached for a day.

const URL_CSV = "https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv";

const ENGLISH: Record<string, string> = {
  元日: "New Year's Day",
  成人の日: "Coming of Age Day",
  建国記念の日: "National Foundation Day",
  天皇誕生日: "The Emperor's Birthday",
  春分の日: "Vernal Equinox Day",
  昭和の日: "Shōwa Day",
  憲法記念日: "Constitution Memorial Day",
  みどりの日: "Greenery Day",
  こどもの日: "Children's Day",
  海の日: "Marine Day",
  山の日: "Mountain Day",
  敬老の日: "Respect for the Aged Day",
  秋分の日: "Autumnal Equinox Day",
  スポーツの日: "Sports Day",
  体育の日: "Health and Sports Day",
  文化の日: "Culture Day",
  勤労感謝の日: "Labor Thanksgiving Day",
  休日: "Substitute or bridging holiday",
  振替休日: "Substitute holiday",
  国民の休日: "Citizens' Holiday",
};

interface Holiday {
  date: string;
  name: string;
  nameEn: string | null;
}

export async function GET() {
  try {
    const res = await fetch(URL_CSV, {
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 86400 },
      headers: { "User-Agent": "LiveCityJapan/1.0 (educational project; calendar)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = new TextDecoder("shift_jis").decode(await res.arrayBuffer());
    const thisYear = new Date().getUTCFullYear();
    const holidays: Holiday[] = [];
    for (const line of text.split(/\r?\n/).slice(1)) {
      const [raw, name] = line.split(",");
      const m = raw?.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (!m || !name) continue;
      const year = Number(m[1]);
      if (year < thisYear - 1 || year > thisYear + 2) continue;
      holidays.push({ date: `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`, name: name.trim(), nameEn: ENGLISH[name.trim()] ?? null });
    }
    return Response.json(
      { holidays, source: { name: "Cabinet Office of Japan", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" }, checkedAt: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  } catch {
    return Response.json({ holidays: [], unavailable: true, source: { name: "Cabinet Office of Japan", url: "https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html" }, checkedAt: Date.now() });
  }
}
