import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

// Everything public is open to search engines. Only account/private routes
// and internal API endpoints are excluded.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/login", "/signup", "/settings", "/forgot-password", "/reset-password"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
