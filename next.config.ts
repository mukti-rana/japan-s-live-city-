import type { NextConfig } from "next";

// Security headers, sent with every response.
//
//  Enforced now (they don't depend on what the pages load):
//   - X-Content-Type-Options: the browser must trust the declared file type, never guess one.
//   - X-Frame-Options: other websites may not put ours inside a frame (clickjacking).
//   - Referrer-Policy: other sites learn only the site's address, not the page, when a link is followed.
//   - Permissions-Policy: the camera and other powerful features are off; location and the microphone stay
//     available to this site only (the weather, "near me" and voice features use them).
//   - Cross-Origin-Opener-Policy: pages from other sites can't reach into ours through a popup.
//   - No "X-Powered-By" header (it only tells attackers which framework to aim at).
//   (Strict-Transport-Security is already sent by the host.)
//
//  Report-only for now: Content-Security-Policy. A report-only policy blocks nothing; the browser just sends
//  a note to /api/csp-report for anything it WOULD have blocked, so the list below can be checked against
//  real use (maps, videos, photos, the Supabase connection) before it is switched to enforcing.
//  Scripts and styles still allow 'unsafe-inline' because the framework and the page add small inline
//  scripts/styles; a nonce-based policy would force every page to render on each request (slower, dearer),
//  so that is deliberately not used.
const isDev = process.env.NODE_ENV === "development";

let supabaseOrigin = "https://*.supabase.co";
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
} catch {
  /* keep the wildcard */
}
const supabaseWs = supabaseOrigin.replace(/^http/, "ws");

const csp = [
  "default-src 'self'",
  // YouTube's player script (the live city camera on the home page loads it).
  `script-src 'self' 'unsafe-inline' https://www.youtube.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // News and place photos come from many publishers and Wikimedia; map tiles from ArcGIS and OpenStreetMap.
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://api.bigdatacloud.net https://api-bdc.io${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.openstreetmap.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(self), microphone=(self), payment=(), usb=(), interest-cohort=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
