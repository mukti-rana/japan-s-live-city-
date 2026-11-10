import PostCard from "@/components/community/PostCard";
import { FeedActionsProvider } from "@/components/community/PostCardActions";
import type { CommunityPost } from "@/lib/community/types";

// Posts in a masonry grid (columns keep each photo's real proportions). One
// provider tells every card which of them you have saved, in a single request.
export default function PostGrid({ posts }: { posts: CommunityPost[] }) {
  return (
    <FeedActionsProvider postIds={posts.map((p) => p.id)}>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </FeedActionsProvider>
  );
}

// The same cards in a sideways rail (Trending, Hidden places). Scrolls with a
// finger on a phone; snaps card by card.
export function PostRail({ posts }: { posts: CommunityPost[] }) {
  return (
    <FeedActionsProvider postIds={posts.map((p) => p.id)}>
      <ul className="-mx-3 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
        {posts.map((post) => (
          <li key={post.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[300px]">
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </FeedActionsProvider>
  );
}
