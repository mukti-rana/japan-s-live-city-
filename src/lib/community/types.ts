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
