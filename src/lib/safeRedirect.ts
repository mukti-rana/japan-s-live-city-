// Where to send someone after the sign-in link has been used. The "next" value comes from the address
// (anyone can write anything there), so it is only ever accepted as a path on THIS website:
//   - it must start with a single "/" ("//host", "/\host" and "@host" tricks are refused),
//   - it must not hold line breaks, tabs or backslashes (browsers read "\" as "/"),
//   - and, once resolved against our own address, it must still be on our own origin.
// Anything else becomes the fallback. (Previously the value was glued straight onto the address, so
// "next=@evil.example" produced "https://ourhost@evil.example", which is evil.example.)
export function safeNextPath(next: string | null | undefined, origin: string, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 512) return fallback;
  if (next[0] !== "/" || next[1] === "/" || next[1] === "\\") return fallback;
  if (/[\u0000-\u001F\u007F\\]/.test(next)) return fallback;
  try {
    const base = new URL(origin);
    const url = new URL(next, base);
    if (url.origin !== base.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
