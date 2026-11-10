export default function PlaceCommunityLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 pb-10" aria-busy="true">
      <div className="h-44 animate-pulse rounded-3xl border border-glass-border bg-glass-bg" />
      <div className="h-40 animate-pulse rounded-3xl border border-glass-border bg-glass-bg" />
      <div className="h-32 animate-pulse rounded-2xl border border-glass-border bg-glass-bg" />
      <div className="h-32 animate-pulse rounded-2xl border border-glass-border bg-glass-bg" />
    </div>
  );
}
