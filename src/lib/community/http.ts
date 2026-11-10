// Small helpers shared by the Community API routes.

// A request that changes something must come from this website itself. Browsers
// always send an Origin header on such requests; one from another site (or
// none) is refused. This is in addition to the session cookie's SameSite rule.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
