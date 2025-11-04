import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const SITE_URL = getSiteUrl();
const STAGE = process.env.NODE_ENV ?? "production";

export default function robots(): MetadataRoute.Robots {
  const isProd = /^prod/i.test(STAGE) || STAGE === "production";

  if (!isProd) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      sitemap: `${SITE_URL}/sitemap.xml`,
      host: SITE_URL,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
