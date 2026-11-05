import type { LanguageCode } from "@/lib/i18n/languages";

// Dates and "x ago" text in the visitor's language.
//
// Intl covers Japanese, Hindi, Chinese and Korean in every browser we target,
// but Nepali data is missing from some browsers and Node builds (Intl then
// silently answers in English). For Nepali the English parts are re-labelled
// with Nepali month/weekday names and Devanagari digits, so the date always
// follows the chosen language. Every other language goes straight to Intl.

const MONTHS_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const WEEKDAYS_NE_LONG = ["आइतबार", "सोमबार", "मङ्गलबार", "बुधबार", "बिहीबार", "शुक्रबार", "शनिबार"];
const WEEKDAYS_NE_SHORT = ["आइत", "सोम", "मङ्गल", "बुध", "बिही", "शुक्र", "शनि"];

const MONTHS_EN_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS_EN_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEVANAGARI = "०१२३४५६७८९";
const digitsNe = (s: string) => s.replace(/\d/g, (d) => DEVANAGARI[Number(d)]);

function indexOfName(list: string[], value: string): number {
  const v = value.toLowerCase().replace(/\.$/, "");
  return list.findIndex((name) => name.toLowerCase() === v || name.slice(0, 3).toLowerCase() === v.slice(0, 3));
}

// Drop-in for `new Intl.DateTimeFormat(language, options)`.
export function dateFormatter(language: LanguageCode, options: Intl.DateTimeFormatOptions): { format(date: Date | number): string } {
  if (language !== "ne") return new Intl.DateTimeFormat(language, options);
  const base = new Intl.DateTimeFormat("en-US", options);
  return {
    format(date) {
      return base
        .formatToParts(date)
        .map((p) => {
          switch (p.type) {
            case "month": {
              const i = indexOfName(MONTHS_EN_LONG, p.value);
              return i >= 0 ? MONTHS_NE[i] : digitsNe(p.value);
            }
            case "weekday": {
              const i = indexOfName(WEEKDAYS_EN_LONG, p.value);
              if (i < 0) return p.value;
              return p.value.length > 4 ? WEEKDAYS_NE_LONG[i] : WEEKDAYS_NE_SHORT[i];
            }
            case "dayPeriod":
              return /pm/i.test(p.value) ? "अपराह्न" : "पूर्वाह्न";
            case "day":
            case "year":
            case "hour":
            case "minute":
            case "second":
              return digitsNe(p.value);
            case "literal":
              return digitsNe(p.value);
            default:
              return p.value;
          }
        })
        .join("");
    },
  };
}

// 30 Nepali phrases are not worth a dictionary entry each: unit + direction.
const NE_UNIT: Record<string, string> = {
  second: "सेकेन्ड",
  minute: "मिनेट",
  hour: "घण्टा",
  day: "दिन",
  week: "हप्ता",
  month: "महिना",
  year: "वर्ष",
};

// Drop-in for `new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(value, unit)`.
export function relativeTime(language: LanguageCode, value: number, unit: Intl.RelativeTimeFormatUnit): string {
  if (language !== "ne") return new Intl.RelativeTimeFormat(language, { numeric: "auto" }).format(value, unit);
  const u = unit.replace(/s$/, "");
  if (u === "day" && value === 0) return "आज";
  if (u === "day" && value === 1) return "भोलि";
  if (u === "day" && value === -1) return "हिजो";
  if (u === "second" && value === 0) return "अहिले";
  const n = digitsNe(String(Math.abs(value)));
  const word = NE_UNIT[u] ?? u;
  return value < 0 ? `${n} ${word} अघि` : `${n} ${word}मा`;
}
