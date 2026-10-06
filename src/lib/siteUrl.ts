// The site's public address, for sitemap/robots/metadata. Prefers an
// explicit NEXT_PUBLIC_SITE_URL, then the production domain Vercel provides
// automatically at build time (a free built-in variable), then localhost.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) return `https://${vercelProduction}`;
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();
