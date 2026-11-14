import Tx from "@/components/i18n/Tx";

// Shown while a Community page loads: the tabs, header, filter toolbar and the
// card grid take their final shape immediately, so nothing jumps when the real
// content arrives.
export default function CommunityLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1760px] flex-col gap-6" aria-busy="true" role="status">
      <span className="sr-only">
        <Tx en="Loading" />
      </span>
      <div className="flex gap-2 overflow-hidden border-b border-white/8 pb-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="cm-skeleton h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5 sm:p-6">
        <div className="cm-skeleton h-3 w-24 rounded" />
        <div className="cm-skeleton mt-4 h-9 w-72 max-w-full rounded-lg" />
        <div className="cm-skeleton mt-3 h-4 w-full max-w-md rounded" />
        <div className="cm-skeleton mt-6 h-12 w-full max-w-2xl rounded-xl" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="cm-skeleton h-10 w-28 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 2xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121212]">
            <div className="cm-skeleton aspect-[4/3]" />
            <div className="flex flex-col gap-3 p-4">
              <div className="cm-skeleton h-4 w-1/2 rounded" />
              <div className="cm-skeleton h-5 w-4/5 rounded" />
              <div className="cm-skeleton h-3 w-2/3 rounded" />
              <div className="cm-skeleton mt-2 h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
