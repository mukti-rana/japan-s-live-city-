// The photographs on the homepage, with who took them and under what licence.
// All eight are from Wikimedia Commons, licensed CC0 (public-domain dedication), so
// no credit is legally required — it is shown anyway, as a courtesy. Each file was
// resized to 2560 px wide and converted to WebP at quality 80; camera metadata was
// removed. The full record (source pages, originals) is in
// public/images/home/CREDITS.md.

export interface HomePhoto {
  src: string;
  width: number;
  height: number;
  // What the picture shows, for screen readers.
  alt: string;
  // A 24 px blurred copy to show while the photo loads.
  blur: string;
  credit: { title: string; author: string; license: string; licenseUrl: string; sourceUrl: string };
}

export const HOME_PHOTOS = {
  hero: {
    src: "/images/home/hero-tokyo-roppongi-night.webp",
    width: 2560,
    height: 1507,
    alt: "Tokyo skyline at night with Tokyo Tower glowing orange, seen from Shibuya Stream",
    blur: "data:image/webp;base64,UklGRlIAAABXRUJQVlA4IEYAAAAQBACdASoYAA4APu1krU6ppaSiMAgBMB2JZQCdICXDA2N353jjuaBpAAD+yv1nB269AC3OmJzUJ3zwy73Nl8YLOc3KX4AA",
    credit: {"title": "Roppongi at night seen from Shibuya Stream.jpg", "author": "Syced", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Roppongi_at_night_seen_from_Shibuya_Stream.jpg"},
  },
  fushimi: {
    src: "/images/home/kyoto-fushimi-inari.webp",
    width: 2560,
    height: 1707,
    alt: "Rows of vermilion torii gates along a stairway at Fushimi Inari, Kyoto",
    blur: "data:image/webp;base64,UklGRooAAABXRUJQVlA4IH4AAADwAwCdASoYABAAPu1iqk2ppaQiMAgBMB2JbACdAB7GYcds32a1GnOAAPrpaJSg6garf7f6zGlEhUn8y+C8EyXMy1zFMzB8mvOnSZaJBgDhcHdVKfILOV+hy59q+U8w0ysAcjRPK8Ycy/p/1Qc8mG989FSsqVyG5LOzJEcAAAA=",
    credit: {"title": "20181110 Fushimi Inari Torii 9.jpg", "author": "Balon Greyjoy", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:20181110_Fushimi_Inari_Torii_9.jpg"},
  },
  dotonbori: {
    src: "/images/home/osaka-dotonbori-night.webp",
    width: 2560,
    height: 1707,
    alt: "The Dōtonbori canal in Osaka at night, lined with bright neon signs",
    blur: "data:image/webp;base64,UklGRpwAAABXRUJQVlA4IJAAAACQBACdASoYABAAPu1mq04ppaQiMAgBMB2JaAC7MoAKOL4pAVeuxuHW61yFyYAA/vwPp+hZ7k9iYi6u3OesbJUA7lxY6zEqG1sD4Ydc25UggmYOJeGrs5bvd0ZdhB8JPQ50/Pt7d0bPqvyA0S5BdON7NlRNfyQOZXBlesJbzVIU15R/NByl2maG3b6whhgAAAA=",
    credit: {"title": "Osaka Dotonbori yoru 04.jpg", "author": "Sakai Yayoi", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Osaka_Dotonbori_yoru_04.jpg"},
  },
  itsukushima: {
    src: "/images/home/miyajima-itsukushima-torii.webp",
    width: 2560,
    height: 1707,
    alt: "The floating torii gate of Itsukushima Shrine on Miyajima, with mountains behind",
    blur: "data:image/webp;base64,UklGRnwAAABXRUJQVlA4IHAAAADwAwCdASoYABAAPu1krU2ppaSiMAgBMB2JYgCdAGp2qerSjeKssd8AAP744VEn1lmZJCF7JtIzeqc5qUvPGPWRtPrbDdZzFIm19dFbtR/B/Y/JVyOTHQmwEQ5zw16NgBR9Uwhcq1+B8NhAF5zKgIAA",
    credit: {"title": "20181111 Itsukushima Shrine torii-2.jpg", "author": "Balon Greyjoy", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:20181111_Itsukushima_Shrine_torii-2.jpg"},
  },
  todaiji: {
    src: "/images/home/nara-todai-ji-gate.webp",
    width: 2560,
    height: 1707,
    alt: "The Great South Gate of Tōdai-ji temple in Nara",
    blur: "data:image/webp;base64,UklGRnYAAABXRUJQVlA4IGoAAAAwBACdASoYABAAPu1krU6ppaSiMAgBMB2JZQDA3CHgNqgFsjzQDbUMiAAA/rQrKtdxlLaj04I85+S+pG4lmBx1zTuVx+KVG1Ds6O7gU7nUHGTXYSntUV/g+A+eyPq/4yn6JXhNnnTN6gAA",
    credit: {"title": "20190121 Tōdai-ji Great South Gate-1.jpg", "author": "Balon Greyjoy", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:20190121_T%C5%8Ddai-ji_Great_South_Gate-1.jpg"},
  },
  fuji: {
    src: "/images/home/fuji-chureito-pagoda.webp",
    width: 2560,
    height: 1440,
    alt: "Chureito Pagoda among autumn leaves with snow-capped Mount Fuji behind",
    blur: "data:image/webp;base64,UklGRoAAAABXRUJQVlA4IHQAAABQBACdASoYAA4APu1iqk2ppaQiMAgBMB2JaACdMoAC/E5h2G1NpzPEsFCAAP5bAPsjNKgLJudxI9bKeYfN3R8+7GnMeaSO9gNnu0aavOkusBhCqyoOvhVfLSPgxlz5sZvOW8xpYWaUkLqbaQudDxTbjCJgAA==",
    credit: {"title": "12-Chureito-pagoda-and-Mount-Fuji-Japan (29677439878).jpg", "author": "Dang Son", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:12-Chureito-pagoda-and-Mount-Fuji-Japan_(29677439878).jpg"},
  },
  hakodate: {
    src: "/images/home/hokkaido-hakodate-night.webp",
    width: 2560,
    height: 1707,
    alt: "Aerial view of Hakodate at night, with city lights curving along the bay",
    blur: "data:image/webp;base64,UklGRmIAAABXRUJQVlA4IFYAAADQAwCdASoYABAAPu1iqk2ppaQiMAgBMB2JZgCdAB6Q9iiGZbnPUygA/svkmgrAF9RUFvXtOKjrQyht7J1lUMnHZc406N1Qoy+giKa96odGE6eamgAAAA==",
    credit: {"title": "Aerial view of Hakodate at night.jpg", "author": "Fumikas Sagisavas", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Aerial_view_of_Hakodate_at_night.jpg"},
  },
  kiyomizu: {
    src: "/images/home/kyoto-kiyomizu-night.webp",
    width: 2560,
    height: 1770,
    alt: "Kiyomizu-dera temple in Kyoto lit up at night among autumn trees",
    blur: "data:image/webp;base64,UklGRoQAAABXRUJQVlA4IHgAAAAwBQCdASoYABEAPu1qqk8ppiOiMBgIATAdiWQAnTMOQr/FgdaLZoAi/jjc6FhnNz2t0AD+8Q2qOYD8XTsHb1jnoeXtJ6LedEN2OdhE/eWqNgbbbLXRybSd3BNW7OLod1JB5fNdafWfFp4VqbvHRxkRS+VNWTJAAAA=",
    credit: {"title": "Kiyomizu-dera autumn night.jpg", "author": "lumoplank", "license": "CC0", "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en", "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kiyomizu-dera_autumn_night.jpg"},
  },
} as const satisfies Record<string, HomePhoto>;

export type HomePhotoKey = keyof typeof HOME_PHOTOS;
