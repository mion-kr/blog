import { desc, eq } from 'drizzle-orm';
import { getReadDb, schema } from '../db';

const { posts } = schema;

/** 이관 전처럼 정렬을 넘기지 않아 created_at 내림차순(posts.service.ts 기본값). */
export async function listFeedPosts(limit: number) {
  return getReadDb()
    .select({ slug: posts.slug, title: posts.title, excerpt: posts.excerpt, publishedAt: posts.publishedAt, createdAt: posts.createdAt, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(limit);
}

/** sitemap: 발행 글 전체(50개씩 나눠 읽던 이관 전과 같은 결과), slug 중복 제거. 실패는 오류로 둔다. */
export async function listSitemapPosts() {
  const rows = await getReadDb()
    .select({ slug: posts.slug, publishedAt: posts.publishedAt, createdAt: posts.createdAt, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt), desc(posts.id));
  const seen = new Set<string>();
  return rows.filter((r) => r.slug && !seen.has(r.slug) && seen.add(r.slug));
}
