import type { NextRequest } from "next/server";
import { postsApi } from "@/lib/api-client";
import type { PostResponseDto } from "@repo/shared";

import { getSiteUrl } from "@/lib/site";
const SITE_URL = getSiteUrl();
const FEED_TITLE = "Mion's Blog";
const FEED_DESCRIPTION = "Mion의 기술 블로그 최신 글";
const FEED_LINK = SITE_URL;
const ITEMS_LIMIT = Number(process.env.RSS_ITEMS_LIMIT ?? 50);

export async function GET(_req: NextRequest) {
  const posts = await fetchRecentPosts(ITEMS_LIMIT);
  const xml = buildRssXml(posts);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

async function fetchRecentPosts(limit: number): Promise<PostResponseDto[]> {
  try {
    const res = await postsApi.getPosts({ page: 1, limit, published: true });
    return res.success ? res.data : [];
  } catch {
    return [];
  }
}

function buildRssXml(posts: PostResponseDto[]): string {
  const items = posts
    .map((p) => {
      const link = `${SITE_URL}/posts/${p.slug}`;
      const pubDate = new Date(p.publishedAt ?? p.createdAt).toUTCString();
      const guid = link;
      const description = escapeXml(
        p.excerpt ?? `${p.title}에 대한 Mion의 기술 블로그 포스트입니다.`,
      );

      return `\n    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
    </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${FEED_LINK}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>ko-kr</language>
    <ttl>60</ttl>${items}
  </channel>
</rss>`;

  return rss;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
