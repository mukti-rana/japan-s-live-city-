import type { ReactNode } from "react";
import Tx from "@/components/i18n/Tx";

// Heading row for a section of a page: title, optional supporting line, and an
// optional action on the right (a "view all" link, a filter button).
//
// Takes an explicit heading level so the page keeps one h1 and a sensible
// outline — several sections currently hard-code h2 regardless of nesting.
export default function SectionHeader({
  title,
  subtitle,
  action,
  as: Tag = "h2",
  className = "",
}: {
  /** English title text; translated through the shared memory. */
  title: string;
  subtitle?: string;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <Tag className="text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
          <Tx en={title} />
        </Tag>
        {subtitle && (
          <p className="mt-1 text-sm text-text-secondary">
            <Tx en={subtitle} />
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
