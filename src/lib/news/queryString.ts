export type NewsParams = Record<string, string | number | boolean | undefined | null>;

export function toQueryString(params: NewsParams): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    qs.set(key, value === true ? "1" : String(value));
  }
  return qs.toString();
}
