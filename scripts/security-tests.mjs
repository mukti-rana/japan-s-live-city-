// Security regression tests. No packages needed: `npm run security:test` (Node 22+ runs the .ts files directly).
//  - the first group tests the logic on its own;
//  - the second group tests a RUNNING copy of the site (BASE_URL, default http://localhost:3000) and is skipped if none answers.
import test from "node:test";
import assert from "node:assert/strict";
import { safeNextPath } from "../src/lib/safeRedirect.ts";
import { AI_LIMITS, GUEST_LIMIT, MEMBER_LIMIT, clientKey, resetRateLimitsForTests, takeToken, validateAssistantBody } from "../src/lib/ai/guard.ts";
import nextConfig from "../next.config.ts";
import { parseCoordinates, roundCoordinate } from "../src/lib/geo/coordinates.ts";
import { createRateLimiter, clientIp } from "../src/lib/rateLimit.ts";
import { fetchWithinHosts, hostAllowed } from "../src/lib/news/fetchWithinHosts.ts";

const ORIGIN = "https://livecityjapan.vercel.app";

test("safeNextPath: only paths on this website are accepted", () => {
  for (const ok of ["/", "/settings", "/reset-password", "/community/post/1?x=1#y", "/a@b"]) assert.equal(safeNextPath(ok, ORIGIN), ok);
  const bad = ["@evil.example", "//evil.example", "/\\evil.example", "/\\/evil.example", "https://evil.example", "javascript:alert(1)", "evil.example", "", null, undefined, "/ok\nSet-Cookie: x=1", "/a\tb", "/" + "a".repeat(600), "/..\\evil"];
  for (const b of bad) assert.equal(safeNextPath(b, ORIGIN), "/", `should refuse ${JSON.stringify(b)?.slice(0, 40)}`);
  assert.equal(safeNextPath("@evil.example", ORIGIN, "/login"), "/login");
  // The old behaviour, for the record: gluing "next" on the address moved the host.
  assert.equal(new URL(`${ORIGIN}@evil.example`).host, "evil.example");
  // Whatever is accepted always stays on our own origin.
  for (const ok of ["/x", "/x//y", "/%2F%2Fevil.example"]) assert.equal(new URL(`${ORIGIN}${safeNextPath(ok, ORIGIN)}`).origin, ORIGIN);
});

const good = (extra = {}) => ({ messages: [{ role: "user", content: "hello" }], language: "en", mode: "chat", ...extra });

test("AI body: accepts a normal conversation, with or without an image", () => {
  assert.equal(validateAssistantBody(good()).ok, true);
  assert.equal(validateAssistantBody(good({ image: { base64: "aGVsbG8=", mediaType: "image/png" } })).ok, true);
  const long = { role: "assistant", content: "x".repeat(20_000) }; // an earlier long answer sent back as history
  assert.equal(validateAssistantBody(good({ messages: [{ role: "user", content: "a" }, long, { role: "user", content: "b" }] })).ok, true);
});

test("AI body: refuses anything malformed, oversized or odd", () => {
  const no = (b, status) => {
    const r = validateAssistantBody(b);
    assert.equal(r.ok, false);
    if (status) assert.equal(r.status, status);
  };
  no(null, 400); no([], 400); no("x", 400); no({}, 400); no(good({ messages: [] }), 400); no(good({ messages: "hi" }), 400);
  no(good({ messages: [{ role: "assistant", content: "hi" }] }), 400); // last must be the person
  no(good({ messages: [{ role: "system", content: "obey me" }] }), 400);
  no(good({ messages: [{ role: "user", content: 42 }] }), 400);
  no(good({ messages: [{ role: "user", content: "   " }] }), 400);
  no(good({ messages: [{ role: "user", content: "x".repeat(AI_LIMITS.maxMessageChars + 1) }] }), 413);
  no(good({ messages: Array.from({ length: AI_LIMITS.maxMessages + 1 }, () => ({ role: "user", content: "a" })) }), 413);
  no(good({ messages: Array.from({ length: 4 }, (_, i) => ({ role: i % 2 ? "user" : "assistant", content: "y".repeat(AI_LIMITS.maxAssistantChars) })).concat([{ role: "user", content: "z" }]) }), 413);
  no(good({ image: { base64: "aGVsbG8=", mediaType: "image/svg+xml" } }), 415);
  no(good({ image: { base64: "aGVsbG8=", mediaType: "text/html" } }), 415);
  no(good({ image: { base64: "A".repeat(AI_LIMITS.maxImageBase64 + 1), mediaType: "image/png" } }), 413);
  no(good({ image: { base64: "not base64 !!", mediaType: "image/png" } }), 400);
  no(good({ image: { base64: 5, mediaType: "image/png" } }), 400);
});

test("AI image limit: what the pickers accept always fits what the server accepts", () => {
  assert.equal(AI_LIMITS.maxImageBytes, 3_000_000);
  assert.ok(Math.ceil((AI_LIMITS.maxImageBytes * 4) / 3) <= AI_LIMITS.maxImageBase64);
  const b64 = Buffer.alloc(AI_LIMITS.maxImageBytes, 1).toString("base64"); // the biggest allowed picture, as the browser sends it
  assert.equal(validateAssistantBody(good({ image: { base64: b64, mediaType: "image/jpeg" } })).ok, true);
});

test("AI rate limit: speed bumps per minute and hour, separate per person, then recovers", () => {
  resetRateLimitsForTests();
  const t0 = 1_000_000;
  for (let i = 0; i < GUEST_LIMIT.perMinute; i++) assert.equal(takeToken("ip:1.1.1.1", GUEST_LIMIT, t0 + i), 0);
  const wait = takeToken("ip:1.1.1.1", GUEST_LIMIT, t0 + 10);
  assert.ok(wait >= 1 && wait <= 60, `waits ${wait}s`);
  assert.equal(takeToken("ip:2.2.2.2", GUEST_LIMIT, t0 + 10), 0); // someone else is not affected
  assert.equal(takeToken("ip:1.1.1.1", GUEST_LIMIT, t0 + 61_000), 0); // a new minute
  // The hourly cap holds even if the minute resets.
  resetRateLimitsForTests();
  let t = t0, allowed = 0;
  for (let i = 0; i < 200; i++, t += 61_000) if (takeToken("ip:3.3.3.3", GUEST_LIMIT, t) === 0) allowed++;
  assert.ok(allowed <= GUEST_LIMIT.perHour * 4 && allowed >= GUEST_LIMIT.perHour, `allowed ${allowed}`); // 200 minutes ≈ 3.3 hours
  assert.ok(MEMBER_LIMIT.perHour > GUEST_LIMIT.perHour && MEMBER_LIMIT.perMinute > GUEST_LIMIT.perMinute);
});

test("AI rate limit: the memory it uses has a ceiling", () => {
  resetRateLimitsForTests();
  for (let i = 0; i < 12_000; i++) takeToken(`ip:flood-${i}`, GUEST_LIMIT, 5_000_000 + i);
  // Still works, and an early address was forgotten rather than the table growing without end.
  assert.equal(takeToken("ip:flood-11999", GUEST_LIMIT, 5_020_000), 0);
});

test("clientKey: signed-in person first, then the first forwarded address", () => {
  const h = (m) => ({ get: (k) => m[k.toLowerCase()] ?? null });
  assert.equal(clientKey(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }), "abc"), "u:abc");
  assert.equal(clientKey(h({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }), null), "ip:9.9.9.9");
  assert.equal(clientKey(h({ "x-real-ip": "8.8.8.8" })), "ip:8.8.8.8");
  assert.equal(clientKey(h({})), "ip:unknown");
});

test("headers: every security header is configured; CSP is report-only and covers the key sources", async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  const rules = await nextConfig.headers();
  const all = Object.fromEntries(rules.find((r) => r.source === "/:path*").headers.map((h) => [h.key, h.value]));
  assert.equal(all["X-Content-Type-Options"], "nosniff");
  assert.equal(all["X-Frame-Options"], "DENY");
  assert.match(all["Referrer-Policy"], /strict-origin-when-cross-origin/);
  assert.match(all["Permissions-Policy"], /camera=\(\)/);
  assert.match(all["Permissions-Policy"], /geolocation=\(self\)/);
  assert.match(all["Permissions-Policy"], /microphone=\(self\)/);
  assert.ok(all["Cross-Origin-Opener-Policy"]);
  assert.equal("Content-Security-Policy" in all, false, "the policy must not be enforcing yet");
  const csp = all["Content-Security-Policy-Report-Only"];
  for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "report-uri /api/csp-report", "https://www.youtube-nocookie.com", "https://www.youtube.com", "https://api-bdc.io", "https://www.openstreetmap.org"]) assert.ok(csp.includes(d), `missing ${d}`);
  assert.doesNotMatch(csp, /script-src[^;]*\*/); // no wildcard script sources
});

test("coordinates: strict parsing, rounded to about 1 km", () => {
  assert.deepEqual(parseCoordinates("35.689487", "139.691711"), { lat: 35.69, lon: 139.69 });
  assert.deepEqual(parseCoordinates("-0.001", "0"), { lat: 0, lon: 0 }); // no negative zero
  assert.deepEqual(parseCoordinates("-90", "180"), { lat: -90, lon: 180 });
  assert.equal(roundCoordinate(34.12999), 34.13);
  const bad = [[null, "1"], ["1", null], ["", ""], ["", "1"], ["NaN", "1"], ["Infinity", "1"], ["1e2", "1"], ["0x10", "1"], ["91", "0"], ["0", "181"], ["-91", "0"], ["1.", "1"], [".5", "1"], ["1,5", "1"], ["1 ", "1x"], ["--1", "1"], ["1".repeat(40), "1"], ["35.6; drop table", "1"]];
  for (const [a, b] of bad) assert.equal(parseCoordinates(a, b), null, `should refuse ${JSON.stringify([a, b])}`);
  // The number of distinct places that can be asked about is bounded: nearby points collapse to the same key.
  const keys = new Set();
  for (let i = 0; i < 1000; i++) keys.add(JSON.stringify(parseCoordinates((35.6 + i * 1e-6).toFixed(6), (139.7 + i * 1e-6).toFixed(6))));
  assert.ok(keys.size <= 2, `1000 slightly different points -> ${keys.size} distinct places`);
});

test("rate limiter: per address, per minute and hour, bounded memory", () => {
  const l = createRateLimiter(100);
  const lim = { perMinute: 3, perHour: 5 };
  const t0 = 10_000_000;
  for (let i = 0; i < 3; i++) assert.equal(l.take("a", lim, t0 + i), 0);
  const wait = l.take("a", lim, t0 + 5);
  assert.ok(wait >= 1 && wait <= 60);
  assert.equal(l.take("b", lim, t0 + 5), 0);
  assert.equal(l.take("a", lim, t0 + 61_000), 0); // next minute
  assert.equal(l.take("a", lim, t0 + 62_000), 0);
  assert.ok(l.take("a", lim, t0 + 63_000) > 0, "the hourly allowance (5) is reached even though the minute reset");
  for (let i = 0; i < 1000; i++) l.take(`flood-${i}`, lim, t0 + 100_000 + i);
  assert.ok(l.size() <= 100, `memory stays bounded (${l.size()} keys)`);
  assert.equal(clientIp({ get: (k) => ({ "x-forwarded-for": "9.9.9.9, 1.1.1.1" })[k] ?? null }), "9.9.9.9");
});

test("news fetcher: every redirect address is checked BEFORE it is requested", async () => {
  const hosts = ["nhk.or.jp", "japantoday.com"];
  assert.ok(hostAllowed("https://www3.nhk.or.jp/news/x", hosts));
  for (const bad of ["http://www3.nhk.or.jp/x", "https://evil.example/x", "https://nhk.or.jp.evil.example/x", "https://evilnhk.or.jp/x", "ftp://nhk.or.jp/x", "not a url", "https://169.254.169.254/latest/meta-data", "https://localhost/x", "https://user:pw@evil.example/"]) assert.equal(hostAllowed(bad, hosts), null, bad);

  const script = (map) => { const calls = []; const f = async (u) => { calls.push(String(u)); const r = map[String(u)]; if (!r) return new Response("no", { status: 404 }); return r(); }; return { f, calls }; };
  const page = () => new Response("<html>ok</html>", { status: 200 });
  const redirect = (to, code = 302) => () => new Response(null, { status: code, headers: { location: to } });

  // direct
  let { f, calls } = script({ "https://www3.nhk.or.jp/a": page });
  let got = await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f });
  assert.ok(got && (await got.res.text()) === "<html>ok</html>" && calls.length === 1);
  // redirect inside the publisher's domains (absolute and relative)
  ({ f, calls } = script({ "https://www3.nhk.or.jp/a": redirect("/b"), "https://www3.nhk.or.jp/b": redirect("https://www.nhk.or.jp/c", 301), "https://www.nhk.or.jp/c": page }));
  got = await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f });
  assert.ok(got && got.url === "https://www.nhk.or.jp/c" && calls.length === 3);
  // redirect OFF the domain: the evil address is NEVER requested
  ({ f, calls } = script({ "https://www3.nhk.or.jp/a": redirect("https://evil.example/steal"), "https://evil.example/steal": page }));
  got = await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f });
  assert.equal(got, null);
  assert.deepEqual(calls, ["https://www3.nhk.or.jp/a"], "only the publisher was contacted");
  // redirects to internal / plain-http / look-alike addresses are never requested either
  for (const to of ["http://www3.nhk.or.jp/plain", "https://169.254.169.254/latest/meta-data/", "https://nhk.or.jp.evil.example/", "http://localhost:3000/admin", "//evil.example/x"]) {
    ({ f, calls } = script({ "https://www3.nhk.or.jp/a": redirect(to) }));
    got = await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f });
    assert.equal(got, null, to);
    assert.equal(calls.length, 1, `${to} must not be requested`);
  }
  // a starting address that is not allowed is never requested
  ({ f, calls } = script({}));
  assert.equal(await fetchWithinHosts("https://evil.example/", hosts, {}, { fetchImpl: f }), null);
  assert.equal(calls.length, 0);
  // loops are capped; a redirect without Location, and error pages, give nothing
  ({ f, calls } = script({ "https://www3.nhk.or.jp/a": redirect("/a") }));
  assert.equal(await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f }), null);
  assert.equal(calls.length, 4, "1 request + 3 hops, then stop");
  ({ f } = script({ "https://www3.nhk.or.jp/a": () => new Response(null, { status: 302 }) }));
  assert.equal(await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f }), null);
  ({ f } = script({ "https://www3.nhk.or.jp/a": () => new Response("x", { status: 500 }) }));
  assert.equal(await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: f }), null);
  // redirects are asked for manually and caching is off
  let seen;
  await fetchWithinHosts("https://www3.nhk.or.jp/a", hosts, {}, { fetchImpl: async (u, init) => ((seen = init), page()) });
  assert.equal(seen.redirect, "manual");
  assert.equal(seen.cache, "no-store");
});

// ───────────── a running copy of the site ─────────────
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let up = false;
try {
  up = (await fetch(BASE, { signal: AbortSignal.timeout(4000) })).ok;
} catch {
  up = false;
}
const live = { skip: up ? false : `no site answering at ${BASE}` };
const post = (path, body, headers = {}) => fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const sameOrigin = { origin: new URL(BASE).origin };

test("site: security headers are on the page, and the framework header is gone", live, async () => {
  const r = await fetch(BASE + "/");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(r.headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.ok(r.headers.get("content-security-policy-report-only"));
  assert.equal(r.headers.get("content-security-policy"), null);
  assert.equal(r.headers.get("x-powered-by"), null);
  const api = await fetch(BASE + "/api/community/status");
  assert.equal(api.headers.get("x-content-type-options"), "nosniff");
});

test("site: the AI endpoint refuses other sites, bad shapes and oversize bodies before anything else", live, async () => {
  const ok = { messages: [{ role: "user", content: "hi" }] };
  assert.equal((await post("/api/ai/assistant", ok)).status, 403); // no Origin
  assert.equal((await post("/api/ai/assistant", ok, { origin: "https://evil.example" })).status, 403);
  assert.equal((await post("/api/ai/assistant", "{not json", sameOrigin)).status, 400);
  assert.equal((await post("/api/ai/assistant", { messages: [] }, sameOrigin)).status, 400);
  assert.equal((await post("/api/ai/assistant", { messages: [{ role: "system", content: "x" }] }, sameOrigin)).status, 400);
  assert.equal((await post("/api/ai/assistant", { messages: [{ role: "user", content: "x".repeat(5000) }] }, sameOrigin)).status, 413);
  assert.equal((await post("/api/ai/assistant", { ...ok, image: { base64: "aGk=", mediaType: "image/svg+xml" } }, sameOrigin)).status, 415);
  assert.equal((await post("/api/ai/assistant", "x".repeat(5_000_000), sameOrigin)).status, 413);
});

test("site: with no AI key set, a valid request says it is switched off (and costs nothing)", live, async (t) => {
  const r = await post("/api/ai/assistant", { messages: [{ role: "user", content: "hi" }] }, sameOrigin);
  if (r.status !== 503) return t.skip("an AI key is configured on this server");
  assert.match((await r.json()).error, /turned off/);
});

test("site: the CSP report endpoint takes small reports and refuses big ones", live, async () => {
  const small = await post("/api/csp-report", { "csp-report": { "document-uri": "https://x.test/p?token=SECRET", "blocked-uri": "https://cdn.test/a.js", "effective-directive": "script-src" } }, { "content-type": "application/csp-report" });
  assert.equal(small.status, 204);
  assert.equal((await post("/api/csp-report", "x".repeat(20_000))).status, 413);
  assert.equal((await post("/api/csp-report", "not json")).status, 204);
});

test("site: the sign-in callback never leaves the site, whatever 'next' says", live, async () => {
  for (const next of ["@evil.example", "//evil.example", "https://evil.example", "/\\evil.example"]) {
    const r = await fetch(`${BASE}/auth/callback?code=bogus&next=${encodeURIComponent(next)}`, { redirect: "manual" });
    const to = r.headers.get("location") ?? "";
    assert.ok(r.status >= 300 && r.status < 400, `status ${r.status}`);
    assert.equal(new URL(to, BASE).origin, new URL(BASE).origin, `${next} -> ${to}`);
  }
});

test("site: the sign-in callback fails gently (a friendly redirect, never a 5xx, no detail leaked)", live, async () => {
  for (const url of [`${BASE}/auth/callback`, `${BASE}/auth/callback?code=bogus`, `${BASE}/auth/callback?code=${"x".repeat(2000)}&next=/settings`]) {
    const r = await fetch(url, { redirect: "manual" });
    assert.ok(r.status >= 300 && r.status < 400, `${url.slice(0, 60)} -> ${r.status}`);
    const to = new URL(r.headers.get("location") ?? "", BASE);
    assert.equal(to.pathname, "/login");
    const msg = to.searchParams.get("error") ?? "";
    assert.ok(msg.length > 0 && msg.length < 120, "a short, friendly message");
    assert.doesNotMatch(msg, /supabase|env|key|token|stack|error:|undefined|configured/i);
  }
});

test("site: /api/weather/live refuses bad coordinates and rate-limits floods", live, async () => {
  const get = (q) => fetch(`${BASE}/api/weather/live${q}`);
  for (const q of ["", "?lat=35.6", "?lon=139.7", "?lat=&lon=", "?lat=abc&lon=1", "?lat=91&lon=0", "?lat=0&lon=181", "?lat=1e2&lon=1", "?lat=35.6;x&lon=139"]) assert.equal((await get(q)).status, 400, `should refuse ${q}`);
  // A flood of different coordinates from one address is cut off by the allowance (20 a minute).
  const codes = [];
  for (let i = 0; i < 26; i++) codes.push((await get(`?lat=35.${String(10 + i)}&lon=139.70`)).status);
  // On a serverless host (Vercel) requests may be served by different server copies, each with its own memory, so the in-code limit is
  // a speed bump, not a guaranteed cutoff there (the Vercel firewall is the global backstop). It must cut a flood off on one server.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) assert.ok(codes.includes(429), `a flood should hit the limit: ${codes.join(",")}`);
  assert.ok(codes.every((c) => [200, 429, 502].includes(c)), `unexpected codes ${codes.join(",")}`);
  const limited = await get("?lat=35.5&lon=139.7");
  if (limited.status === 429) assert.ok(Number(limited.headers.get("retry-after")) >= 1);
});
