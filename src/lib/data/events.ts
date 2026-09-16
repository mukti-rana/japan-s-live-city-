// Curated list of real, well-documented annual Japanese festivals — the
// same approach used for Popular Places. There is no free, keyless "live
// events" API for Japan, so instead of fabricating attendee counts or a
// hardcoded "Today" badge, each entry carries its real recurring date rule.
// The service layer computes the actual next occurrence against today's
// date, so the "ongoing" / "in N days" status shown to users is honest.
//
// `image` is only set where a verified real photo of that specific
// festival was found — most niche regional matsuri have no dedicated
// free stock photography. Thumb already falls back to a gradient + icon
// when `image` is omitted, which is more honest than showing a mismatched
// stock photo under a festival's name.

export type EventCategory = "Festival" | "Fireworks";

export type DateRule =
  | { type: "fixed"; month: number; day: number; days?: number }
  | { type: "nthWeekday"; month: number; weekday: number; nth: number; days?: number }
  | { type: "lastWeekday"; month: number; weekday: number; days?: number };

export interface FestivalInfo {
  name: string;
  city: string;
  wikipediaTitle: string;
  category: EventCategory;
  image?: string;
  gradient: string;
  dateRule: DateRule;
}

export const FESTIVALS: FestivalInfo[] = [
  {
    name: "Sapporo Snow Festival",
    city: "Sapporo",
    wikipediaTitle: "Sapporo_Snow_Festival",
    category: "Festival",
    image: "/images/event-sapporo-snow.jpg",
    gradient: "from-azure/40 to-mint/20",
    dateRule: { type: "fixed", month: 2, day: 4, days: 8 },
  },
  {
    name: "Aoi Matsuri",
    city: "Kyoto",
    wikipediaTitle: "Aoi_Matsuri",
    category: "Festival",
    gradient: "from-mint/30 to-gold/20",
    dateRule: { type: "fixed", month: 5, day: 15, days: 1 },
  },
  {
    name: "Sanja Matsuri",
    city: "Tokyo",
    wikipediaTitle: "Sanja_Matsuri",
    category: "Festival",
    gradient: "from-sakura/30 to-azure/25",
    dateRule: { type: "nthWeekday", month: 5, weekday: 5, nth: 3, days: 3 },
  },
  {
    name: "Hakata Gion Yamakasa",
    city: "Fukuoka",
    wikipediaTitle: "Hakata_Gion_Yamakasa",
    category: "Festival",
    gradient: "from-gold/40 to-sakura/20",
    dateRule: { type: "fixed", month: 7, day: 1, days: 15 },
  },
  {
    name: "Gion Matsuri",
    city: "Kyoto",
    wikipediaTitle: "Gion_Matsuri",
    category: "Festival",
    gradient: "from-sakura/40 to-gold/25",
    dateRule: { type: "fixed", month: 7, day: 1, days: 31 },
  },
  {
    name: "Tenjin Matsuri",
    city: "Osaka",
    wikipediaTitle: "Tenjin_Matsuri",
    category: "Festival",
    gradient: "from-gold/30 to-azure/20",
    dateRule: { type: "fixed", month: 7, day: 24, days: 2 },
  },
  {
    name: "Sumidagawa Fireworks Festival",
    city: "Tokyo",
    wikipediaTitle: "Sumidagawa_Fireworks_Festival",
    category: "Fireworks",
    gradient: "from-azure/40 to-sakura/25",
    dateRule: { type: "lastWeekday", month: 7, weekday: 6, days: 1 },
  },
  {
    name: "Nebuta Matsuri",
    city: "Aomori",
    wikipediaTitle: "Nebuta_Matsuri",
    category: "Festival",
    image: "/images/event-nebuta.jpg",
    gradient: "from-sakura/40 to-azure/20",
    dateRule: { type: "fixed", month: 8, day: 2, days: 6 },
  },
  {
    name: "Awa Odori",
    city: "Tokushima",
    wikipediaTitle: "Awa_Odori",
    category: "Festival",
    gradient: "from-gold/40 to-mint/20",
    dateRule: { type: "fixed", month: 8, day: 12, days: 4 },
  },
  {
    name: "Daimonji",
    city: "Kyoto",
    wikipediaTitle: "Daimonji",
    category: "Fireworks",
    gradient: "from-sakura/30 to-gold/25",
    dateRule: { type: "fixed", month: 8, day: 16, days: 1 },
  },
  {
    name: "Kishiwada Danjiri Matsuri",
    city: "Osaka",
    wikipediaTitle: "Kishiwada_Danjiri_Matsuri",
    category: "Festival",
    gradient: "from-azure/30 to-gold/20",
    dateRule: { type: "nthWeekday", month: 9, weekday: 6, nth: 3, days: 2 },
  },
  {
    name: "Nagasaki Kunchi",
    city: "Nagasaki",
    wikipediaTitle: "Nagasaki_Kunchi",
    category: "Festival",
    gradient: "from-mint/30 to-azure/25",
    dateRule: { type: "fixed", month: 10, day: 7, days: 3 },
  },
  {
    name: "Takayama Festival",
    city: "Takayama",
    wikipediaTitle: "Takayama_Festival",
    category: "Festival",
    gradient: "from-gold/30 to-sakura/20",
    dateRule: { type: "fixed", month: 10, day: 9, days: 2 },
  },
  {
    name: "Jidai Matsuri",
    city: "Kyoto",
    wikipediaTitle: "Jidai_Matsuri",
    category: "Festival",
    gradient: "from-sakura/30 to-mint/20",
    dateRule: { type: "fixed", month: 10, day: 22, days: 1 },
  },
];
