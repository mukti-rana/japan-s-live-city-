import type { CitySlug } from "@/lib/data/cities";

export interface CityCamInfo {
  videoId: string;
  location: string;
  source: string;
  watchUrl: string;
}

// Real, currently-live public YouTube streams — each verified live and
// embeddable before being added here (not guessed from memory, since
// stream availability and video IDs change over time). If a stream ever
// goes offline, YouTube's own embedded player shows its native "video
// unavailable" state rather than this app inventing a fallback.
export const CITY_CAMS: Record<CitySlug, CityCamInfo> = {
  tokyo: {
    videoId: "dfVK7ld38Ys",
    location: "SHIBUYA, TOKYO",
    source: "FNN Prime Online",
    watchUrl: "https://www.youtube.com/watch?v=dfVK7ld38Ys",
  },
  osaka: {
    videoId: "i2PpmC1IeKk",
    location: "DOTONBORI, OSAKA",
    source: "RVJJP",
    watchUrl: "https://www.youtube.com/watch?v=i2PpmC1IeKk",
  },
  kyoto: {
    videoId: "YjZRZM_dqNU",
    location: "KYOTO STATION",
    source: "JR Kyoto Station LiveCam",
    watchUrl: "https://www.youtube.com/watch?v=YjZRZM_dqNU",
  },
};
