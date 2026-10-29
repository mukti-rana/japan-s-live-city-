import type { FestivalInfo } from "@/lib/data/events";
import type { EventKind } from "@/lib/events/types";

export function classifyKindForReference(festival: FestivalInfo): EventKind {
  // Daimonji is a ritual of bonfires on the hillsides, not fireworks.
  if (/daimonji/i.test(festival.name)) return "festival";
  return festival.category === "Fireworks" ? "fireworks" : "festival";
}
