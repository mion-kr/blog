import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { getDb, schema } from '../db';
import { tagsForPosts, type PostTag } from './public';

const { posts, categories, tags, postTags } = schema;

export type ListOptions = {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  categorySlug?: string;
  tagSlug?: string;
  /** true: 발행만, false: 초안만, undefined: 전체 */
  published?: boolean;
};

export type PostListItem = typeof posts.$inferSelect & {
  category: { id: string; name: string; slug: string };
  tags: PostTag[];
};

const SORT_COLUMNS = { title: posts.title, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt, viewCount: posts.viewCount } as const;

/** 이관 전 drizzle-posts.repository findAll과 같은 조건. 없는 카테고리·태그 slug는 빈 결과. */
export async function listPosts(options: ListOptions): Promise<{ items: PostListItem[]; total: number }> {
  const db = getDb();
  const where: SQL[] = [];
  if (options.published !== undefined) where.push(eq(posts.published, options.published));
  if (options.search) {
    const term = `%${options.search}%`;
    where.push(or(like(posts.title, term), like(posts.content, term), like(posts.excerpt, term))!);
  }
  if (options.categorySlug) {
    const category = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, options.categorySlug)).get();
    if (!category) return { items: [], total: 0 };
    where.push(eq(posts.categoryId, category.id));
  }
  if (options.tagSlug) {
    const tag = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, options.tagSlug)).get();
    if (!tag) return { items: [], total: 0 };
    where.push(inArray(posts.id, db.select({ id: postTags.postId }).from(postTags).where(eq(postTags.tagId, tag.id))));
  }
  const condition = where.length ? and(...where) : undefined;
  const column = SORT_COLUMNS[options.sort as keyof typeof SORT_COLUMNS] ?? posts.createdAt;
  const direction = options.order === 'asc' ? asc : desc;

  const [rows, totalRow] = await Promise.all([
    db
      .select({ post: posts, category: { id: categories.id, name: categories.name, slug: categories.slug } })
      .from(posts)
      .innerJoin(categories, eq(posts.categoryId, categories.id))
      .where(condition)
      .orderBy(direction(column), desc(posts.id))
      .limit(options.limit)
      .offset((options.page - 1) * options.limit),
    db.select({ n: count() }).from(posts).where(condition).get(),
  ]);
  const tagMap = await tagsForPosts(rows.map((r) => r.post.id));
  return {
    items: rows.map((r) => ({ ...r.post, category: r.category, tags: tagMap.get(r.post.id) ?? [] })),
    total: totalRow?.n ?? 0,
  };
}

/** 이관 전 공개·관리자 목록용 카테고리: 글 수는 발행 글 실시간 계산, sort=postCount는 저장 컬럼 기준. */
export async function listCategories(options: { limit: number; page?: number; sort?: 'name' | 'postCount' | 'createdAt' | 'updatedAt'; order?: 'asc' | 'desc'; search?: string }) {
  const db = getDb();
  const column = { name: categories.name, postCount: categories.postCount, createdAt: categories.createdAt, updatedAt: categories.updatedAt }[options.sort ?? 'createdAt'];
  const direction = options.order === 'asc' ? asc : desc;
  const condition = options.search ? like(categories.name, `%${options.search}%`) : undefined;
  const [items, totalRow] = await Promise.all([
    db
      .select({
        id: categories.id, name: categories.name, slug: categories.slug, description: categories.description,
        createdAt: categories.createdAt, updatedAt: categories.updatedAt,
        postCount: sql<number>`(SELECT count(*) FROM posts p WHERE p.category_id = categories.id AND p.published = 1)`,
      })
      .from(categories)
      .where(condition)
      .orderBy(direction(column), asc(categories.id))
      .limit(options.limit)
      .offset(((options.page ?? 1) - 1) * options.limit),
    db.select({ n: count() }).from(categories).where(condition).get(),
  ]);
  return { items, total: totalRow?.n ?? 0 };
}

/** 이관 전 태그 목록: 글 수는 post_tags 전체(초안 포함), sort=postCount는 저장 컬럼 기준. */
export async function listTags(options: { limit: number; page?: number; sort?: 'name' | 'postCount' | 'createdAt' | 'updatedAt'; order?: 'asc' | 'desc'; search?: string }) {
  const db = getDb();
  const column = { name: tags.name, postCount: tags.postCount, createdAt: tags.createdAt, updatedAt: tags.updatedAt }[options.sort ?? 'createdAt'];
  const direction = options.order === 'asc' ? asc : desc;
  const condition = options.search ? like(tags.name, `%${options.search}%`) : undefined;
  const [items, totalRow] = await Promise.all([
    db
      .select({
        id: tags.id, name: tags.name, slug: tags.slug, createdAt: tags.createdAt, updatedAt: tags.updatedAt,
        postCount: sql<number>`(SELECT count(*) FROM post_tags pt WHERE pt.tag_id = tags.id)`,
      })
      .from(tags)
      .where(condition)
      .orderBy(direction(column), asc(tags.id))
      .limit(options.limit)
      .offset(((options.page ?? 1) - 1) * options.limit),
    db.select({ n: count() }).from(tags).where(condition).get(),
  ]);
  return { items, total: totalRow?.n ?? 0 };
}
