// Fetch a page from a publisher, following redirects by hand so that EVERY address is checked BEFORE it is requested.
//
// The old code let the platform follow redirects and looked at the final address only afterwards, by which point a
// request to wherever the redirect pointed had already been made (a "blind" request: the answer was thrown away, but
// the request still happened). Here each hop must be https and on one of the publisher's own domains first, and the
// number of hops is capped. No imports, so it can be tested on its own.

export function hostAllowed(raw: string, allowedHosts: string[]): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    if (!allowedHosts.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`))) return null;
    return url;
  } catch {
    return null;
  }
}

export interface Fetched {
  res: Response;
  url: string;
}

export async function fetchWithinHosts(
  start: string,
  allowedHosts: string[],
  init: { signal?: AbortSignal; headers?: Record<string, string> } = {},
  { maxHops = 3, fetchImpl = fetch }: { maxHops?: number; fetchImpl?: typeof fetch } = {},
): Promise<Fetched | null> {
  let current = start;
  for (let hop = 0; hop <= maxHops; hop++) {
    const allowed = hostAllowed(current, allowedHosts);
    if (!allowed) return null; // checked before anything is requested
    const res = await fetchImpl(allowed.toString(), { ...init, cache: "no-store", redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      void res.body?.cancel().catch(() => {});
      if (!location) return null;
      try {
        current = new URL(location, allowed).toString(); // a relative Location is resolved against the current page
      } catch {
        return null;
      }
      continue;
    }
    return res.ok && res.body ? { res, url: allowed.toString() } : null;
  }
  return null; // too many redirects
}
