// An optional video is only ever a LINK to YouTube or Vimeo (no video files are stored). This turns that link into the address of the service's
// own embedded player, using YouTube's privacy-enhanced domain; the page loads it only after the visitor presses play.
export function videoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com") id = u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : u.searchParams.get("v");
    if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    let vid: string | null = null;
    if (host === "vimeo.com") vid = u.pathname.split("/").filter(Boolean)[0] ?? null;
    else if (host === "player.vimeo.com") vid = u.pathname.split("/")[2] ?? null;
    if (vid && /^\d{4,12}$/.test(vid)) return `https://player.vimeo.com/video/${vid}?autoplay=1`;
  } catch {
    /* not a link */
  }
  return null;
}
