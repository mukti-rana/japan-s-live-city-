// A small, dependency-free rate limiter for public API routes, kept in the server's memory.
//
// On a serverless host every running copy of the site has its own memory, so this is a speed bump that stops one
// visitor from hammering an endpoint, not a strict global limit. The hard backstops are the host's firewall rules and
// the CDN cache in front of cacheable routes. Memory is bounded: past `maxKeys` the oldest addresses are forgotten.

export type Limit = { perMinute: number; perHour: number };
type Bucket = { minuteStart: number; minute: number; hourStart: number; hour: number };

export function createRateLimiter(maxKeys = 5_000) {
  const buckets = new Map<string, Bucket>();
  return {
    // Counts one request for this key. Returns how long to wait (seconds) if a limit is reached, else 0.
    take(key: string, limit: Limit, now = Date.now()): number {
      if (buckets.size >= maxKeys) {
        for (const [k, v] of buckets) if (now - v.hourStart >= 3_600_000) buckets.delete(k);
        while (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value as string);
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
    },
    size: () => buckets.size,
    clear: () => buckets.clear(),
  };
}

// The address a request came from (Vercel sets x-forwarded-for itself and replaces anything the visitor sent).
export function clientIp(headers: { get(name: string): string | null }): string {
  const ip = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
  return ip.slice(0, 64);
}
