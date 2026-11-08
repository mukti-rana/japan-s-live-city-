// The 72 micro-seasons (七十二候) of the traditional Japanese calendar: each
// of the 24 solar terms is split into three periods of about five days, every
// one named for something small happening in nature. The dates are the
// traditional ones, counted in five-day steps from Risshun (Feb 4); the real
// astronomical dates move by a day or so from year to year, so the card says
// "around". Meanings are the usual English renderings.

export interface MicroSeason {
  start: [month: number, day: number];
  ja: string;
  kana: string;
  en: string;
  // The season it belongs to, for the card's animation.
  season: "spring" | "summer" | "autumn" | "winter";
}

const S = (start: [number, number], ja: string, kana: string, en: string, season: MicroSeason["season"]): MicroSeason => ({ start, ja, kana, en, season });

export const MICRO_SEASONS: MicroSeason[] = [
  S([2, 4], "東風凍を解く", "はるかぜこおりをとく", "East winds melt the ice", "spring"),
  S([2, 9], "黄鶯睍睆く", "うぐいすなく", "Bush warblers start singing in the mountains", "spring"),
  S([2, 14], "魚氷に上る", "うおこおりをいずる", "Fish emerge from the ice", "spring"),
  S([2, 19], "土脉潤い起こる", "つちのしょううるおいおこる", "Rain moistens the soil", "spring"),
  S([2, 24], "霞始めて靆く", "かすみはじめてたなびく", "Mist starts to linger", "spring"),
  S([3, 1], "草木萌え動る", "そうもくめばえいずる", "Grass sprouts and trees bud", "spring"),
  S([3, 6], "蟄虫戸を啓く", "すごもりむしとをひらく", "Hibernating insects surface", "spring"),
  S([3, 11], "桃始めて笑う", "ももはじめてさく", "The first peach blossoms open", "spring"),
  S([3, 16], "菜虫蝶と化る", "なむしちょうとなる", "Caterpillars become butterflies", "spring"),
  S([3, 21], "雀始めて巣くう", "すずめはじめてすくう", "Sparrows start to nest", "spring"),
  S([3, 26], "桜始めて開く", "さくらはじめてひらく", "The first cherry blossoms open", "spring"),
  S([3, 31], "雷乃ち声を発す", "かみなりすなわちこえをはっす", "Distant thunder is heard", "spring"),
  S([4, 5], "玄鳥至る", "つばめきたる", "Swallows return", "spring"),
  S([4, 10], "鴻雁北す", "こうがんかえる", "Wild geese fly north", "spring"),
  S([4, 15], "虹始めて見る", "にじはじめてあらわる", "The first rainbows appear", "spring"),
  S([4, 20], "葭始めて生ず", "あしはじめてしょうず", "The first reeds sprout", "spring"),
  S([4, 25], "霜止んで苗出ず", "しもやんでなえいずる", "The last frost passes and rice seedlings grow", "spring"),
  S([4, 30], "牡丹華く", "ぼたんはなさく", "Peonies bloom", "spring"),
  S([5, 5], "蛙始めて鳴く", "かわずはじめてなく", "Frogs start singing", "summer"),
  S([5, 10], "蚯蚓出ずる", "みみずいずる", "Earthworms surface", "summer"),
  S([5, 15], "竹笋生ず", "たけのこしょうず", "Bamboo shoots sprout", "summer"),
  S([5, 21], "蚕起きて桑を食む", "かいこおきてくわをはむ", "Silkworms start feasting on mulberry leaves", "summer"),
  S([5, 26], "紅花栄う", "べにばなさかう", "Safflowers bloom", "summer"),
  S([5, 31], "麦秋至る", "むぎのときいたる", "Wheat ripens and is harvested", "summer"),
  S([6, 6], "蟷螂生ず", "かまきりしょうず", "Praying mantises hatch", "summer"),
  S([6, 11], "腐草蛍と為る", "くされたるくさほたるとなる", "Fireflies glow over damp grass", "summer"),
  S([6, 16], "梅子黄なり", "うめのみきなり", "Plums turn yellow", "summer"),
  S([6, 21], "乃東枯るる", "なつかれくさかるる", "Self-heal withers", "summer"),
  S([6, 26], "菖蒲華く", "あやめはなさく", "Irises bloom", "summer"),
  S([7, 1], "半夏生ず", "はんげしょうず", "Crow-dipper sprouts", "summer"),
  S([7, 7], "温風至る", "あつかぜいたる", "Warm winds blow", "summer"),
  S([7, 12], "蓮始めて開く", "はすはじめてひらく", "The first lotus blossoms open", "summer"),
  S([7, 17], "鷹乃ち学を習う", "たかすなわちわざをならう", "Young hawks learn to fly", "summer"),
  S([7, 23], "桐始めて花を結ぶ", "きりはじめてはなをむすぶ", "Paulownia trees produce seeds", "summer"),
  S([7, 28], "土潤いて溽し暑し", "つちうるおうてむしあつし", "The earth is damp and the air humid", "summer"),
  S([8, 2], "大雨時行る", "たいうときどきふる", "Great rains sometimes fall", "summer"),
  S([8, 7], "涼風至る", "すずかぜいたる", "Cool winds blow", "autumn"),
  S([8, 13], "寒蝉鳴く", "ひぐらしなく", "Evening cicadas sing", "autumn"),
  S([8, 18], "蒙霧升降る", "ふかききりまとう", "Thick fog descends", "autumn"),
  S([8, 23], "綿柎開く", "わたのはなしべひらく", "Cotton flowers bloom", "autumn"),
  S([8, 28], "天地始めて粛し", "てんちはじめてさむし", "The heat starts to die down", "autumn"),
  S([9, 2], "禾乃ち登る", "こくものすなわちみのる", "Rice ripens", "autumn"),
  S([9, 8], "草露白し", "くさのつゆしろし", "Dew glistens white on the grass", "autumn"),
  S([9, 13], "鶺鴒鳴く", "せきれいなく", "Wagtails sing", "autumn"),
  S([9, 18], "玄鳥去る", "つばめさる", "Swallows leave", "autumn"),
  S([9, 23], "雷乃ち声を収む", "かみなりすなわちこえをおさむ", "Thunder ceases", "autumn"),
  S([9, 28], "蟄虫戸を坏す", "むしかくれてとをふさぐ", "Insects hole up underground", "autumn"),
  S([10, 3], "水始めて涸る", "みずはじめてかるる", "Farmers drain the rice fields", "autumn"),
  S([10, 8], "鴻雁来る", "こうがんきたる", "Wild geese return", "autumn"),
  S([10, 13], "菊花開く", "きくのはなひらく", "Chrysanthemums bloom", "autumn"),
  S([10, 18], "蟋蟀戸に在り", "きりぎりすとにあり", "Crickets chirp around the door", "autumn"),
  S([10, 23], "霜始めて降る", "しもはじめてふる", "The first frost", "autumn"),
  S([10, 28], "霎時施す", "こさめときどきふる", "Light rain sometimes falls", "autumn"),
  S([11, 2], "楓蔦黄なり", "もみじつたきばむ", "Maple leaves and ivy turn yellow", "autumn"),
  S([11, 7], "山茶始めて開く", "つばきはじめてひらく", "Camellias bloom", "winter"),
  S([11, 12], "地始めて凍る", "ちはじめてこおる", "The land starts to freeze", "winter"),
  S([11, 17], "金盞香し", "きんせんかさく", "Daffodils bloom", "winter"),
  S([11, 22], "虹蔵れて見えず", "にじかくれてみえず", "Rainbows hide away", "winter"),
  S([11, 27], "朔風葉を払う", "きたかぜこのはをはらう", "The north wind blows the leaves from the trees", "winter"),
  S([12, 2], "橘始めて黄ばむ", "たちばなはじめてきばむ", "Tachibana citrus leaves start to turn yellow", "winter"),
  S([12, 7], "閉塞く冬と成る", "そらさむくふゆとなる", "Cold sets in and winter begins", "winter"),
  S([12, 12], "熊穴に蟄る", "くまあなにこもる", "Bears start hibernating in their dens", "winter"),
  S([12, 17], "鱖魚群がる", "さけのうおむらがる", "Salmon gather and swim upstream", "winter"),
  S([12, 22], "乃東生ず", "なつかれくさしょうず", "Self-heal sprouts", "winter"),
  S([12, 27], "麋角解る", "さわしかのつのおる", "Deer shed their antlers", "winter"),
  S([1, 1], "雪下りて麦のびる", "ゆきわたりてむぎのびる", "Wheat sprouts under the snow", "winter"),
  S([1, 5], "芹乃ち栄う", "せりすなわちさかう", "Japanese parsley flourishes", "winter"),
  S([1, 10], "水泉動く", "しみずあたたかをふくむ", "Springs thaw", "winter"),
  S([1, 15], "雉始めて雊く", "きじはじめてなく", "Pheasants start to call", "winter"),
  S([1, 20], "款冬華く", "ふきのはなさく", "Butterbur buds appear", "winter"),
  S([1, 25], "水沢腹く堅し", "さわみずこおりつめる", "Ice thickens on the streams", "winter"),
  S([1, 30], "鶏始めて乳く", "にわとりはじめてとやにつく", "Hens start laying eggs", "winter"),
];

// The micro-season in force on a given month/day: the latest one that has
// started, wrapping around the new year.
export function microSeasonOn(month: number, day: number): { current: MicroSeason; next: MicroSeason; daysToNext: number } {
  const key = (m: number, d: number) => m * 100 + d;
  const today = key(month, day);
  const sorted = [...MICRO_SEASONS].sort((a, b) => key(...a.start) - key(...b.start));
  let idx = -1;
  for (let i = 0; i < sorted.length; i++) if (key(...sorted[i].start) <= today) idx = i;
  if (idx < 0) idx = sorted.length - 1;
  const current = sorted[idx];
  const next = sorted[(idx + 1) % sorted.length];
  const base = new Date(Date.UTC(2001, month - 1, day));
  const nextDate = new Date(Date.UTC(next.start[0] < month || (next.start[0] === month && next.start[1] <= day) ? 2002 : 2001, next.start[0] - 1, next.start[1]));
  const daysToNext = Math.max(1, Math.round((nextDate.getTime() - base.getTime()) / 86_400_000));
  return { current, next, daysToNext };
}
