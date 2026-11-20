"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, MapPin, Tag } from "lucide-react";
import Bi from "@/components/community/Bi";
import Tx from "@/components/i18n/Tx";
import { useTranslate } from "@/lib/i18n/inline";

interface Option {
  href: string;
  en: string;
  ja: string;
}

// Topics and cities, kept small: two quiet pills under the search. Pressing one opens its choices just below (and closes the other); pressing it
// again, or choosing something, puts it away. Every choice is a plain link to a page that already exists.
export default function QuickBrowse({ topics, cities }: { topics: Option[]; cities: Option[] }) {
  const tr = useTranslate();
  const [open, setOpen] = useState<"topics" | "cities" | null>(null);
  const groups = [
    { id: "topics" as const, label: "Topics", Icon: Tag, options: topics },
    { id: "cities" as const, label: "Cities", Icon: MapPin, options: cities },
  ];
  const chip = "inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.04] px-3.5 text-sm font-medium text-foreground/85 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure";
  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3">
      <div className="flex items-center gap-2" role="group" aria-label={tr("Browse by topic or city")}>
        {groups.map(({ id, label, Icon }) => {
          const on = open === id;
          return (
            <button
              key={id}
              type="button"
              aria-expanded={on}
              aria-controls={`qb-${id}`}
              onClick={() => setOpen(on ? null : id)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure ${on ? "border-white/30 bg-white/10 text-white" : "border-white/12 bg-transparent text-foreground/75 hover:border-white/25 hover:text-white"}`}
            >
              <Icon size={14} aria-hidden="true" />
              <Tx en={label} />
              <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-300 motion-reduce:transition-none ${on ? "rotate-180" : ""}`} />
            </button>
          );
        })}
      </div>
      {groups.map(({ id, options }) => (
        <div key={id} id={`qb-${id}`} className={`grid w-full transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open === id ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={open !== id}>
          <ul className="flex min-h-0 flex-wrap justify-center gap-1.5 overflow-hidden">
            {options.map((o) => (
              <li key={o.href}>
                <Link href={o.href} tabIndex={open === id ? 0 : -1} onClick={() => setOpen(null)} className={chip}>
                  <Bi en={o.en} ja={o.ja} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
