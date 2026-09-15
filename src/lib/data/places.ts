export type PlaceCity =
  | "Tokyo"
  | "Kyoto"
  | "Osaka"
  | "Nara"
  | "Hiroshima"
  | "Hokkaido"
  | "Gifu"
  | "Kanazawa"
  | "Okinawa";

export interface PlaceInfo {
  name: string;
  city: PlaceCity;
  wikipediaTitle: string;
  image: string;
  gradient: string;
}

export const POPULAR_PLACES: PlaceInfo[] = [
  {
    name: "Shibuya Crossing",
    city: "Tokyo",
    wikipediaTitle: "Shibuya_Crossing",
    image: "/images/place-shibuya.jpg",
    gradient: "from-sakura/40 to-azure/25",
  },
  {
    name: "Tokyo Skytree",
    city: "Tokyo",
    wikipediaTitle: "Tokyo_Skytree",
    image: "/images/place-skytree.jpg",
    gradient: "from-azure/40 to-sakura/20",
  },
  {
    name: "Sensō-ji",
    city: "Tokyo",
    wikipediaTitle: "Sensō-ji",
    image: "/images/place-asakusa.jpg",
    gradient: "from-gold/40 to-sakura/20",
  },
  {
    name: "Fushimi Inari-taisha",
    city: "Kyoto",
    wikipediaTitle: "Fushimi_Inari-taisha",
    image: "/images/place-fushimi-inari.jpg",
    gradient: "from-sakura/40 to-gold/20",
  },
  {
    name: "Kiyomizu-dera",
    city: "Kyoto",
    wikipediaTitle: "Kiyomizu-dera",
    image: "/images/place-kiyomizu.jpg",
    gradient: "from-gold/30 to-sakura/25",
  },
  {
    name: "Arashiyama Bamboo Grove",
    city: "Kyoto",
    wikipediaTitle: "Arashiyama_Bamboo_Grove",
    image: "/images/place-arashiyama.jpg",
    gradient: "from-mint/30 to-azure/20",
  },
  {
    name: "Osaka Castle",
    city: "Osaka",
    wikipediaTitle: "Osaka_Castle",
    image: "/images/place-osaka-castle.jpg",
    gradient: "from-gold/40 to-azure/20",
  },
  {
    name: "Dōtonbori",
    city: "Osaka",
    wikipediaTitle: "Dotonbori",
    image: "/images/place-dotonbori-canal.jpg",
    gradient: "from-sakura/30 to-azure/25",
  },
  {
    name: "Umeda Sky Building",
    city: "Osaka",
    wikipediaTitle: "Umeda_Sky_Building",
    image: "/images/place-umeda-sky.jpg",
    gradient: "from-azure/30 to-gold/20",
  },
  {
    name: "Nara Park",
    city: "Nara",
    wikipediaTitle: "Nara_Park",
    image: "/images/place-nara-park.jpg",
    gradient: "from-gold/40 to-mint/20",
  },
  {
    name: "Tōdai-ji",
    city: "Nara",
    wikipediaTitle: "Tōdai-ji",
    image: "/images/place-todaiji.jpg",
    gradient: "from-sakura/30 to-gold/25",
  },
  {
    name: "Itsukushima Shrine",
    city: "Hiroshima",
    wikipediaTitle: "Itsukushima_Shrine",
    image: "/images/place-itsukushima.jpg",
    gradient: "from-azure/40 to-sakura/20",
  },
  {
    name: "Hiroshima Peace Memorial",
    city: "Hiroshima",
    wikipediaTitle: "Hiroshima_Peace_Memorial",
    image: "/images/place-genbaku-dome.jpg",
    gradient: "from-mint/20 to-azure/25",
  },
  {
    name: "Sapporo Clock Tower",
    city: "Hokkaido",
    wikipediaTitle: "Sapporo_Clock_Tower",
    image: "/images/place-sapporo-clock-tower.jpg",
    gradient: "from-azure/30 to-mint/20",
  },
  {
    name: "Mount Hakodate",
    city: "Hokkaido",
    wikipediaTitle: "Mount_Hakodate",
    image: "/images/place-mount-hakodate.jpg",
    gradient: "from-azure/40 to-gold/20",
  },
  {
    name: "Shirakawa-gō",
    city: "Gifu",
    wikipediaTitle: "Shirakawa-gō",
    image: "/images/place-shirakawa-go.jpg",
    gradient: "from-sakura/30 to-azure/20",
  },
  {
    name: "Takayama Old Town",
    city: "Gifu",
    wikipediaTitle: "Takayama,_Gifu",
    image: "/images/place-takayama.jpg",
    gradient: "from-gold/30 to-azure/20",
  },
  {
    name: "Kenroku-en",
    city: "Kanazawa",
    wikipediaTitle: "Kenroku-en",
    image: "/images/place-kenrokuen.jpg",
    gradient: "from-mint/30 to-gold/20",
  },
  {
    name: "Kanazawa Castle",
    city: "Kanazawa",
    wikipediaTitle: "Kanazawa_Castle",
    image: "/images/place-kanazawa-castle.jpg",
    gradient: "from-sakura/30 to-mint/20",
  },
  {
    name: "Shuri Castle",
    city: "Okinawa",
    wikipediaTitle: "Shuri_Castle",
    image: "/images/place-shuri-castle.jpg",
    gradient: "from-sakura/40 to-gold/25",
  },
  {
    name: "Churaumi Aquarium",
    city: "Okinawa",
    wikipediaTitle: "Okinawa_Churaumi_Aquarium",
    image: "/images/place-churaumi-aquarium.jpg",
    gradient: "from-azure/40 to-mint/25",
  },
];
