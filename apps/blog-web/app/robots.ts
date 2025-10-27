import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://blog.mion-space.dev";
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
