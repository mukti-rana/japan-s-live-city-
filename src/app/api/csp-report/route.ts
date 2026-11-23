export const runtime = "nodejs";

// Where browsers send a "this would have been blocked" note while the Content-Security-Policy is in
// report-only mode (see next.config.ts). Nothing is stored: each report becomes one short line in the
// server log (visible in Vercel's logs), so we can see what a policy would block before enforcing it.
//
//  - tiny bodies only; anything else is refused;
//  - only the fields needed to understand the problem are logged, and addresses lose their query and
//    fragment (a search term or token in a page address is never written to the log);
//  - at most a handful of lines per minute per server instance, so it can't be used to flood the logs.

const MAX_BYTES = 8_192;
const PER_MINUTE = 20;
let windowStart = 0;
let count = 0;

const clean = (v: unknown, max = 200): string => {
  if (typeof v !== "string") return "";
  try {
    const u = new URL(v);
    return `${u.origin}${u.pathname}`.slice(0, max);
  } catch {
    return v.replace(/[\r\n\t]/g, " ").slice(0, 60); // keywords such as "inline" or "eval"
  }
};

type Report = Record<string, unknown>;
const lineFor = (r: Report): string =>
  `[csp-report] directive=${clean(r["effective-directive"] ?? r["violated-directive"] ?? r.effectiveDirective, 60)} blocked=${clean(r["blocked-uri"] ?? r.blockedURL)} page=${clean(r["document-uri"] ?? r.documentURL)}`;

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return new Response(null, { status: 413 });
  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (raw.length > MAX_BYTES) return new Response(null, { status: 413 });

  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    count = 0;
  }
  if (count >= PER_MINUTE) return new Response(null, { status: 204 });

  try {
    const body = JSON.parse(raw) as unknown;
    // Two formats exist: { "csp-report": {...} } (report-uri) and [ { body: {...} } ] (Reporting API).
    const reports: Report[] = Array.isArray(body) ? body.map((x) => (x as { body?: Report }).body ?? {}) : [((body as Record<string, Report>)["csp-report"] ?? {}) as Report];
    for (const r of reports.slice(0, 3)) {
      if (count >= PER_MINUTE) break;
      count += 1;
      console.warn(lineFor(r));
    }
  } catch {
    /* not a report: ignore */
  }
  return new Response(null, { status: 204 });
}
