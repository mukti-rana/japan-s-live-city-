import { HOME_PHOTOS, type HomePhoto } from "@/lib/data/homePhotos";

// The photographs the hero rotates through for each city (by HERO_CITIES slug).
// Only real photographs of that place belong here — a city with none simply has no
// entry and the hero keeps its quiet gradient. The hero shows them in this order, so
// the first one is the one a visitor sees first (and the one that is preloaded).
export const CITY_PHOTOS: Record<string, readonly HomePhoto[]> = {
  tokyo: [HOME_PHOTOS.hero, HOME_PHOTOS.tokyoZojojiTokyoTower, HOME_PHOTOS.tokyoSunsetCityscape, HOME_PHOTOS.tokyoShinjukuNight],
  osaka: [HOME_PHOTOS.ownOsakaSign, HOME_PHOTOS.ownOsakaCastleNight, HOME_PHOTOS.ownTsutenkakuDusk, HOME_PHOTOS.dotonbori, HOME_PHOTOS.osakaNakanoshimaNight, HOME_PHOTOS.osakaCastleBridge, HOME_PHOTOS.osakaCastleTiers],
  kyoto: [HOME_PHOTOS.fushimi, HOME_PHOTOS.kiyomizu, HOME_PHOTOS.kyotoSaganoBamboo, HOME_PHOTOS.kyotoFushimiRomonDusk],
  nara: [HOME_PHOTOS.todaiji, HOME_PHOTOS.ownNaraDeer, HOME_PHOTOS.ownNaraStag, HOME_PHOTOS.ownNaraDeerWithOwner, HOME_PHOTOS.ownNaraWakakusaView, HOME_PHOTOS.ownNaraWakakusaLying, HOME_PHOTOS.naraKasugaTorii, HOME_PHOTOS.naraDeer],
  hiroshima: [HOME_PHOTOS.itsukushima, HOME_PHOTOS.hiroshimaAtomicBombDome, HOME_PHOTOS.hiroshimaPeaceCenotaph],
  kobe: [HOME_PHOTOS.kobePortTower, HOME_PHOTOS.kobeCityFromHills],
  sapporo: [HOME_PHOTOS.sapporoTvTower, HOME_PHOTOS.sapporoOdoriParkWinter, HOME_PHOTOS.sapporoSusukinoNight],
  fukuoka: [HOME_PHOTOS.fukuokaHakataSkyline, HOME_PHOTOS.fukuokaHakataSkylineDusk, HOME_PHOTOS.fukuokaOhoriParkPond],
  sendai: [HOME_PHOTOS.sendaiOsakiHachimangu, HOME_PHOTOS.sendaiTanabataStreamers],
};
