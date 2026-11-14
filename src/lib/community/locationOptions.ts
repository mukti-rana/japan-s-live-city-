import { AREAS, FEATURED_AREAS } from "@/lib/community/areas";
import { REGIONS } from "@/lib/explore/regions";
import type { FilterOption } from "@/components/community/FilterToolbar";

// The list behind the Location filter: well-known cities first, then every
// prefecture grouped by region. On Discover a choice opens that place's own page
// (so the value is the page slug); on Photos, Reviews and Places it is the
// prefecture id in ?area=.
export function locationOptions(mode: "path" | "param"): FilterOption[] {
  const out: FilterOption[] = [];
  for (const f of FEATURED_AREAS) {
    // A city that belongs to a prefecture has no value of its own in ?area=; the
    // prefecture row below finds it when you search the city's name.
    if (mode === "param" && f.slug !== f.areaId) continue;
    const a = AREAS.find((x) => x.id === f.areaId);
    out.push({ value: mode === "path" ? f.slug : f.areaId, en: f.en, ja: f.ja, group: "Popular places", hint: `${a?.en ?? ""} ${a?.ja ?? ""}` });
  }
  for (const r of REGIONS) {
    for (const id of r.prefectureIds) {
      const a = AREAS.find((x) => x.id === id);
      if (!a) continue;
      out.push({ value: id, en: a.en, ja: a.ja, group: r.en, groupJa: r.ja, hint: a.cities.join(" ") });
    }
  }
  return out;
}
