"use client";

import { useTranslate } from "@/lib/i18n/inline";

// Fixed English text that appears in a page, translated into the reader's
// language from the shared translation memory. Works inside server components
// (the page stays a server component; only this small piece runs in the
// browser). `npm run i18n:check` reports any text that has no translation yet.
export default function Tx({ en }: { en: string }) {
  const tr = useTranslate();
  return <>{tr(en)}</>;
}
