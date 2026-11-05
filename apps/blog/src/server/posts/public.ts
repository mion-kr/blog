import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { getDb, schema } from '../db';

const { posts, categories, tags, postTags, users } = schema;

export type PostTag = { id: string; name: string; slug: string; postCount: number };
export type PostDetail = typeof posts.$inferSelect & {
  category: typeof categories.$inferSelect;
  author: { id: string; name: string; image: string | null };
  tags: PostTag[];
};

export async function tagsForPosts(postIds: string[]): Promise<Map<string, PostTag[]>> {
  const map = new Map<string, PostTag[]>();
  if (postIds.length === 0) return map;
  const rows = await getDb()
    .select({ postId: postTags.postId, id: tags.id, name: tags.name, slug: tags.slug, postCount: tags.postCount })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, postIds))
    .orderBy(asc(tags.name));
  for (const { postId, ...tag } of rows) map.set(postId, [...(map.get(postId) ?? []), tag]);
  return map;
}

/** 이관 전 findBySlug + 관계. 공개 조회는 published만. */
export async function findPostBySlug(slug: string, { publishedOnly }: { publishedOnly: boolean }): Promise<PostDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({ post: posts, category: categories, author: { id: users.id, name: users.name, image: users.image } })
    .from(posts)
    .innerJoin(categories, eq(posts.categoryId, categories.id))
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(publishedOnly ? and(eq(posts.slug, slug), eq(posts.published, true)) : eq(posts.slug, slug))
    .limit(1);
  if (!row) return null;
  const tagMap = await tagsForPosts([row.post.id]);
  return { ...row.post, category: row.category, author: row.author, tags: tagMap.get(row.post.id) ?? [] };
}

/** 조회수 +1. updated_at은 건드리지 않는다. 실패는 화면을 막지 않는다(이관 전과 같음). */
export async function incrementViewCount(post: PostDetail): Promise<number> {
  try {
    const row = await getDb()
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(eq(posts.id, post.id))
      .returning({ viewCount: posts.viewCount })
      .get();
    return row?.viewCount ?? post.viewCount;
  } catch (error) {
    console.warn('조회수 증가 실패', (error as Error).name);
    return post.viewCount;
  }
}
