import { and, asc, eq, inArray, sql, type SQLWrapper } from 'drizzle-orm';
import { getDb, schema } from '../db';

const { posts, categories, tags, postTags, users } = schema;

export type PostTag = { id: string; name: string; slug: string; postCount: number };
export type PostDetail = typeof posts.$inferSelect & {
  category: typeof categories.$inferSelect;
  author: { id: string; name: string; image: string | null };
  tags: PostTag[];
};

/** 글 id 목록 또는 글 id 하위 쿼리로 태그를 읽는다. 하위 쿼리를 쓰면 글 조회와 같은 왕복에 보낼 수 있다(D1 왕복 1회 ≈ 120ms). */
export async function tagsForPosts(postIds: string[] | SQLWrapper): Promise<Map<string, PostTag[]>> {
  const map = new Map<string, PostTag[]>();
  if (Array.isArray(postIds) && postIds.length === 0) return map;
  const rows = await getDb()
    .select({ postId: postTags.postId, id: tags.id, name: tags.name, slug: tags.slug, postCount: tags.postCount })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, postIds))
    .orderBy(asc(tags.name));
  for (const { postId, ...tag } of rows) map.set(postId, [...(map.get(postId) ?? []), tag]);
  return map;
}

/** 이관 전 findBySlug + 관계. 공개 조회는 published만. 글·태그를 한 번의 왕복(병렬)으로 읽는다. */
export async function findPostBySlug(slug: string, { publishedOnly }: { publishedOnly: boolean }): Promise<PostDetail | null> {
  const db = getDb();
  const condition = publishedOnly ? and(eq(posts.slug, slug), eq(posts.published, true)) : eq(posts.slug, slug);
  const [[row], tagMap] = await Promise.all([
    db
      .select({ post: posts, category: categories, author: { id: users.id, name: users.name, image: users.image } })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(condition)
      .limit(1),
    tagsForPosts(db.select({ id: posts.id }).from(posts).where(condition)),
  ]);
  if (!row) return null;
  return { ...row.post, category: row.category, author: row.author, tags: tagMap.get(row.post.id) ?? [] };
}

/** 공개 글 상세: 글·태그 조회와 조회수 +1을 같은 왕복(병렬)으로 보낸다. 미발행·없는 글은 둘 다 0행이라 조회수가 그대로다. */
export async function viewPublishedPost(slug: string): Promise<{ post: PostDetail; viewCount: number } | null> {
  const [post, viewCount] = await Promise.all([findPostBySlug(slug, { publishedOnly: true }), incrementViewCountBySlug(slug)]);
  return post ? { post, viewCount: viewCount ?? post.viewCount } : null;
}

/** 발행 글 조회수 +1. updated_at은 건드리지 않는다. 실패는 화면을 막지 않는다(이관 전과 같음). 실패하면 null. */
async function incrementViewCountBySlug(slug: string): Promise<number | null> {
  try {
    const row = await getDb()
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(and(eq(posts.slug, slug), eq(posts.published, true)))
      .returning({ viewCount: posts.viewCount })
      .get();
    return row?.viewCount ?? null;
  } catch (error) {
    console.warn('조회수 증가 실패', (error as Error).name);
    return null;
  }
}
