// The shape of a published community post as the pages use it.

export interface CommunityImage {
  path: string;
  thumbPath: string | null;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export interface CommunityPost {
  id: string;
  title: string;
  caption: string;
  areaId: string;
  cityLabel: string | null;
  placeRef: string | null;
  placeLabel: string | null;
  categorySlug: string;
  visitDate: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  publishedAt: string;
  author: { username: string; avatarUrl: string | null };
  images: CommunityImage[];
}

export interface ReviewPhoto {
  path: string;
  thumbPath: string | null;
  width: number | null;
  height: number | null;
}

export interface CommunityReview {
  id: string;
  rating: number;
  body: string;
  recommend: boolean;
  visitDate: string | null;
  helpfulCount: number;
  publishedAt: string;
  status: string;
  author: { username: string; avatarUrl: string | null };
  photos: ReviewPhoto[];
  // True only for the signed-in person's own review (decided on the server).
  isMine: boolean;
}

// The honest numbers for one place. `count` 0 means "no reviews yet" — there is
// never an invented average, spread or percentage.
export interface ReviewStats {
  count: number;
  average: number | null;
  // Reviews per star, index 0 = one star ... index 4 = five stars.
  distribution: [number, number, number, number, number];
  recommendedPercent: number | null;
}
