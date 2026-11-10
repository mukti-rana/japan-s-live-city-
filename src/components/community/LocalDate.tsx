"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { dateFormatter } from "@/lib/i18n/datetime";

// A date written out in the visitor's language. The calendar date is shown as
// given (a visit date has no time zone), so it never shifts a day.
export default function LocalDate({ iso }: { iso: string }) {
  const { language } = useLanguage();
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return <time dateTime={iso}>{dateFormatter(language, { year: "numeric", month: "long", day: "numeric", timeZone: iso.length === 10 ? "UTC" : "Asia/Tokyo" }).format(d)}</time>;
}
