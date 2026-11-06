import { count, eq } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { listPosts } from '../posts/list';

/** 이관 전 get-admin-dashboard.ts: 발행·초안·카테고리·태그 수와 최근 초안 5개(created_at 내림차순) */
export async function getAdminDashboard() {
  const db = getDb();
  const [published, drafts, categories, tags] = await Promise.all([
    db.select({ n: count() }).from(schema.posts).where(eq(schema.posts.published, true)).get(),
    listPosts({ page: 1, limit: 5, order: 'desc', published: false }),
    db.select({ n: count() }).from(schema.categories).get(),
    db.select({ n: count() }).from(schema.tags).get(),
  ]);
  return {
    publishedTotal: published?.n ?? 0,
    draftTotal: drafts.total,
    categoryTotal: categories?.n ?? 0,
    tagTotal: tags?.n ?? 0,
    recentDrafts: drafts.items.slice(0, 5),
  };
}
