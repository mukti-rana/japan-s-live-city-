// Municipal open data arrives as CSV in either UTF-8 or Shift-JIS. This decodes
// whichever it is and parses it (quoted fields, embedded line breaks and all).

export function decodeCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

// ── Dates and times as municipalities write them ─────────────────────────

const ERAS: Record<string, number> = { 令和: 2018, R: 2018, 平成: 1988, H: 1988 };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function valid(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 ? `${y}-${pad(m)}-${pad(d)}` : null;
}

// Every calendar date found in a piece of text, in order.
export function findDates(text: string): string[] {
  const out: string[] = [];
  const re = /(?:(令和|平成|R|H)\s*(\d{1,2})[年.\-/]|(\d{4})\s*[年/.\-])\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/g;
  for (const m of text.matchAll(re)) {
    const year = m[1] ? ERAS[m[1]] + Number(m[2]) : Number(m[3]);
    const date = valid(year, Number(m[4]), Number(m[5]));
    if (date) out.push(date);
  }
  return out;
}

export function parseDate(text: string | undefined): string | null {
  return text ? (findDates(text)[0] ?? null) : null;
}

// A free-text schedule ("2026年4月7日から2026年4月7日,2026年4月21日から…")
// into date ranges: "A から B" pairs, or single days.
export function parseRanges(text: string): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  for (const part of text.split(/[,、\n]/)) {
    const dates = findDates(part);
    if (dates.length === 0) continue;
    const start = dates[0];
    const end = dates.length > 1 ? dates[dates.length - 1] : start;
    ranges.push(end < start ? { start: end, end: start } : { start, end });
  }
  return ranges.sort((a, b) => a.start.localeCompare(b.start));
}

export function parseTime(text: string | undefined): string | null {
  if (!text) return null;
  const m = text.match(/(\d{1,2})\s*[:：時]\s*(\d{2})?/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  return h <= 24 && min < 60 ? `${pad(h === 24 ? 0 : h)}:${pad(min)}` : null;
}
