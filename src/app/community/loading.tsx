// Shown while a Community page loads: the header and filter rows take their
// final shape immediately so the page does not jump when the feed arrives.
export default function CommunityLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-10" aria-busy="true">
      <div className="h-56 animate-pulse rounded-3xl border border-glass-border bg-glass-bg sm:h-64" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-glass-bg" />
        ))}
      </div>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {[220, 300, 260, 340, 240, 280].map((h, i) => (
          <div key={i} style={{ height: h }} className="mb-4 animate-pulse break-inside-avoid rounded-2xl border border-glass-border bg-glass-bg" />
        ))}
      </div>
    </div>
  );
}
