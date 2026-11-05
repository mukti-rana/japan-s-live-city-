import { CATEGORY_BY_ID, SEASONS, pickLabel, seasonOfMonth } from "@/lib/explore/categories";
import type { Destination } from "@/lib/explore/types";
import type { LanguageCode } from "@/lib/i18n/languages";
import { WIDELY_KNOWN } from "@/lib/discovery/discovery";

// Why a place is recommended — only reasons the data supports. "By type"
// reasons say so: they describe the kind of place, not a checked fact about
// this one.
export function reasonsFor(place: Destination, tr: (en: string) => string, language: LanguageCode, month: number, limit = 3): string[] {
  const out: string[] = [];
  const category = CATEGORY_BY_ID.get(place.category);
  if (place.worldHeritage) out.push(tr("A UNESCO World Heritage site"));
  if (place.hiddenGem) out.push(tr("A lesser-known place — a quieter alternative to the famous spots"));
  if (place.languageEditions >= WIDELY_KNOWN) out.push(tr("Popular: it has Wikipedia articles in {n} languages").replace("{n}", String(place.languageEditions)));
  if (category) {
    const season = seasonOfMonth(month);
    if (category.seasons.length < 4 && category.seasons.includes(season)) {
      const label = SEASONS.find((s) => s.id === season);
      out.push(tr("Places like this are typically visited in {season}").replace("{season}", label ? pickLabel(label.label, language) : ""));
    }
    if (category.setting === "indoor") out.push(tr("Mostly indoors — comfortable in any weather"));
    if (category.familyFriendly) out.push(tr("Family-friendly (typical for this kind of place)"));
  }
  return out.slice(0, limit);
}

// The season words ("autumn, winter") a kind of place is typically visited in.
export function typicalSeasons(place: Destination, language: LanguageCode): string {
  return place.seasons
    .map((id) => SEASONS.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .map((s) => pickLabel(s.label, language))
    .join(" · ");
}
