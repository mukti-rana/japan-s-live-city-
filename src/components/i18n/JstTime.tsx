"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { dateFormatter } from "@/lib/i18n/datetime";

// "2026/11/05 14:32" (JMA's format, Japan time) shown in the visitor's language.
export default function JstTime({ raw }: { raw: string }) {
  const { language } = useLanguage();
  const date = new Date(raw.replace(/\//g, "-").replace(" ", "T") + "+09:00");
  if (Number.isNaN(date.getTime())) return <>{raw}</>;
  return (
    <>
      {dateFormatter(language, { timeZone: "Asia/Tokyo", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date)}
    </>
  );
}
