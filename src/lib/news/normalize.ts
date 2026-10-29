import { createHash } from "node:crypto";

// Everything a third-party feed sends is treated as untrusted. Text is
// reduced to plain text (and later rendered by React, which escapes it),
// and URLs must be https links on the publisher's own domain.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

export function toPlainText(html: string | undefined | null): string {
  if (!html) return "";
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

// The summary is the publisher's own description — shortened at a sentence
// or word boundary, never rewritten or extended. Descriptions that only
// repeat the headline are dropped.
export function summaryOf(description: string | undefined | null, title: string, max = 300): string | null {
  const text = toPlainText(description).replace(/\s*(?:…|\.\.\.|\[…\]|Read more.*)$/i, "").trim();
  if (text.length < 20) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[\s\p{P}]/gu, "");
  if (norm(text) === norm(title) || (norm(text).startsWith(norm(title)) && norm(text).length < norm(title).length + 15)) {
    return null;
  }
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentenceEnd = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1).trim();
  const wordEnd = cut.lastIndexOf(" ");
  return `${(wordEnd > max * 0.6 ? cut.slice(0, wordEnd) : cut).trim()}…`;
}

// https links only, and on one of the publisher's own domains.
export function safeUrl(raw: string | undefined | null, allowedHosts?: string[]): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    if (allowedHosts && !allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Same story, same URL: tracking parameters, fragments and trailing slashes
// are removed so duplicates across a publisher's feeds collapse into one.
export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|maca$|traffic_source$|ref$|fbclid$|gclid$|rss$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return raw;
  }
}

// The link shown to readers: tracking parameters removed, otherwise untouched
// (the publisher's own host and path).
export function cleanUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|maca$|traffic_source$|ref$|fbclid$|gclid$|rss$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.toString();
  } catch {
    return raw;
  }
}

export function articleId(canonical: string): string {
  return createHash("sha1").update(canonical).digest("base64url").slice(0, 12);
}

// Tokens for headline similarity: words for English, character pairs for
// Japanese (which has no spaces).
export function titleTokens(title: string): Set<string> {
  const lower = title.toLowerCase();
  const tokens = new Set<string>();
  for (const word of lower.match(/[a-z0-9]{3,}/g) ?? []) tokens.add(word);
  const ja = lower.match(/[぀-ヿ一-鿿]+/g) ?? [];
  for (const run of ja) for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  return tokens;
}

export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}
