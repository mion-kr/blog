import type { APIRoute } from 'astro';
import { buildSitemap, staticSitemapEntries } from '../lib/seo-files';
import { siteUrl } from '../server/env';
import { listSitemapPosts } from '../server/posts/feed';

export const GET: APIRoute = async () => {
  const base = siteUrl();
  // 조회 실패는 부분 결과 대신 오류(이관 전과 같음)
  const posts = await listSitemapPosts();
  const entries = [
    ...staticSitemapEntries(base),
    ...posts.map((p) => ({ url: `${base}/posts/${p.slug}`, lastModified: p.updatedAt ?? p.publishedAt ?? p.createdAt, changeFrequency: 'weekly', priority: 0.7 })),
  ];
  return new Response(buildSitemap(entries), { headers: { 'Content-Type': 'application/xml' } });
};
