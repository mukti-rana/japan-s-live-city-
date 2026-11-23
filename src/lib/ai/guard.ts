// The checks LIVE CITY AI's endpoint makes before it spends anything. No imports on purpose, so it can be
// tested on its own. The endpoint itself adds: same-origin only, then these, then the API key check.
//
//   - validateAssistantBody: the shape and size of what is sent (message count, length, image kind and size),
//     so one request can't be made arbitrarily large or expensive.
//   - takeToken: a small rate limiter, kept in the server's memory. On a serverless host each running copy of
//     the site has its own memory, so this is a *speed bump*, not a strict global limit; the hard limit is the
//     monthly spend cap set in the Anthropic console (and, if ever needed, a Vercel firewall rule).

export const AI_LIMITS = {
  maxMessages: 30,
  // What a person types, and (larger) what the assistant wrote earlier in the same conversation, which is sent back each turn.
  maxMessageChars: 4_000,
  maxAssistantChars: 24_000,
  maxTotalChars: 60_000,
  // base64 text of an image. Vercel refuses request bodies over 4.5 MB anyway.
  maxImageBase64: 4_000_000,
  maxBodyBytes: 4_300_000,
  imageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
} as const;

export type AssistantImage = { base64: string; mediaType: (typeof AI_LIMITS.imageTypes)[number] };
export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type ValidBody = { messages: AssistantMessage[]; language: unknown; mode: unknown; image?: AssistantImage };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function validateAssistantBody(body: unknown): { ok: true; value: ValidBody } | { ok: false; error: string; status: number } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request body.", status: 400 };
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.messages) || b.messages.length === 0) return { ok: false, error: "At least one user message is required.", status: 400 };
  if (b.messages.length > AI_LIMITS.maxMessages) return { ok: false, error: "This conversation is too long. Please start a new one.", status: 413 };

  const messages: AssistantMessage[] = [];
  let total = 0;
  for (const m of b.messages) {
    if (!m || typeof m !== "object") return { ok: false, error: "Invalid request body.", status: 400 };
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return { ok: false, error: "Invalid request body.", status: 400 };
    if (content.length > (role === "user" ? AI_LIMITS.maxMessageChars : AI_LIMITS.maxAssistantChars)) return { ok: false, error: "That message is too long. Please shorten it.", status: 413 };
    total += content.length;
    messages.push({ role, content });
  }
  if (total > AI_LIMITS.maxTotalChars) return { ok: false, error: "This conversation is too long. Please start a new one.", status: 413 };
  if (messages[messages.length - 1].role !== "user" || messages[messages.length - 1].content.trim() === "") return { ok: false, error: "At least one user message is required.", status: 400 };

  let image: AssistantImage | undefined;
  if (b.image !== undefined && b.image !== null) {
    const i = b.image as Record<string, unknown>;
    if (typeof i !== "object" || typeof i.base64 !== "string" || typeof i.mediaType !== "string") return { ok: false, error: "That image couldn't be used.", status: 400 };
    if (!(AI_LIMITS.imageTypes as readonly string[]).includes(i.mediaType)) return { ok: false, error: "Please use a JPEG, PNG, WebP or GIF image.", status: 415 };
    if (i.base64.length > AI_LIMITS.maxImageBase64) return { ok: false, error: "That image is too large. Please use a smaller one.", status: 413 };
    if (!BASE64.test(i.base64)) return { ok: false, error: "That image couldn't be used.", status: 400 };
    image = { base64: i.base64, mediaType: i.mediaType as AssistantImage["mediaType"] };
  }
  return { ok: true, value: { messages, language: b.language, mode: b.mode, image } };
}

// ───────────────────────── rate limit ─────────────────────────

export type Limit = { perMinute: number; perHour: number };
export const GUEST_LIMIT: Limit = { perMinute: 4, perHour: 15 };
export const MEMBER_LIMIT: Limit = { perMinute: 8, perHour: 60 };

type Bucket = { minuteStart: number; minute: number; hourStart: number; hour: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5_000;

// Counts one request for this key. Returns how long to wait (seconds) if a limit is reached, else 0.
export function takeToken(key: string, limit: Limit, now = Date.now()): number {
  if (buckets.size >= MAX_KEYS) {
    for (const [k, v] of buckets) if (now - v.hourStart >= 3_600_000) buckets.delete(k);
    // Still full of recent keys (a flood from many addresses): forget the oldest rather than grow without end.
    while (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value as string);
  }
  let b = buckets.get(key);
  if (!b) {
    b = { minuteStart: now, minute: 0, hourStart: now, hour: 0 };
    buckets.set(key, b);
  }
  if (now - b.minuteStart >= 60_000) {
    b.minuteStart = now;
    b.minute = 0;
  }
  if (now - b.hourStart >= 3_600_000) {
    b.hourStart = now;
    b.hour = 0;
  }
  if (b.minute >= limit.perMinute) return Math.max(1, Math.ceil((b.minuteStart + 60_000 - now) / 1000));
  if (b.hour >= limit.perHour) return Math.max(1, Math.ceil((b.hourStart + 3_600_000 - now) / 1000));
  b.minute += 1;
  b.hour += 1;
  return 0;
}

// Who a request counts against: the signed-in person, else the address the host says it came from
// (Vercel sets x-forwarded-for itself and replaces anything the visitor sent).
export function clientKey(headers: { get(name: string): string | null }, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const ip = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  return `ip:${ip.slice(0, 64)}`;
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
