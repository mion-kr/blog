import type { APIRoute } from 'astro';
import { buildRss } from '../lib/seo-files';
import { env, siteUrl } from '../server/env';
import { listFeedPosts } from '../server/posts/feed';

export const GET: APIRoute = async () => {
  const limit = Number(env.RSS_ITEMS_LIMIT ?? 50) || 50;
  // 조회 실패는 빈 피드(이관 전과 같음)
  const posts = await listFeedPosts(limit).catch(() => []);
  return new Response(buildRss(siteUrl(), posts), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
};
