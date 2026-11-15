import type { ReactNode } from "react";
import Tx from "@/components/i18n/Tx";

// "Nothing here" — distinct from loading and from failure.
//
// Every live surface in this app can legitimately return nothing: no
// earthquakes today, no delays on a line, no events in a prefecture. That is
// good news, not an error, and it should never be left as a blank panel or a
// spinner that never resolves.
export default function EmptyState({
  icon,
  title,
  body,
  action,
  className = "",
}: {
  /** Pass a lucide icon with aria-hidden. */
  icon?: ReactNode;
  /** English title text; translated through the shared memory. */
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-line px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-tertiary">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-text-primary">
        <Tx en={title} />
      </p>
      {body && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-secondary">
          <Tx en={body} />
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
