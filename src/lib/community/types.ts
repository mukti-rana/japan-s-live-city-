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
  // The place reviewed (an Explore place id like "Q123").
  placeRef: string;
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

export interface CommunityComment {
  id: string;
  parentId: string | null;
  depth: number;
  body: string;
  likeCount: number;
  createdAt: string;
  edited: boolean;
  author: { username: string; avatarUrl: string | null };
  isMine: boolean;
}

export interface CommunityQuestion {
  id: string;
  title: string;
  body: string;
  areaId: string;
  placeRef: string | null;
  resolved: boolean;
  answerCount: number;
  helpfulCount: number;
  publishedAt: string;
  // The newest answer's time (or when it was asked). Filled in by list queries.
  lastActivityAt?: string;
  status: string;
  author: { username: string; avatarUrl: string | null };
  isMine: boolean;
}

export interface CommunityAnswer {
  id: string;
  questionId: string;
  body: string;
  helpfulCount: number;
  createdAt: string;
  edited: boolean;
  status: string;
  author: { username: string; avatarUrl: string | null };
  isMine: boolean;
}

export interface CommunityProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  showStats: boolean;
  showVisited: boolean;
}

// Contribution numbers. `null` for a profile whose owner keeps them private.
export interface ProfileStats {
  posts: number;
  reviews: number;
  questions: number;
  answers: number;
  helpfulReceived: number;
  visited: number;
}

export interface ProfileReview {
  id: string;
  placeRef: string;
  rating: number;
  body: string;
  recommend: boolean;
  status: string;
  publishedAt: string;
}

export interface ProfileAnswer {
  id: string;
  body: string;
  helpfulCount: number;
  status: string;
  createdAt: string;
  question: { id: string; title: string } | null;
}

export interface VisitedPlace {
  placeRef: string;
  areaId: string;
  visitedAt: string;
}
