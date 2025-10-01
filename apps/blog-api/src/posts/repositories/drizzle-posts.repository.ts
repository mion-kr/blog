import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  categories,
  count,
  db,
  desc,
  eq,
  ilike,
  inArray,
  or,
  postTags,
  posts,
  sql,
  tags,
  users,
} from '@repo/database';

import {
  PaginatedPostResult,
  PostAggregate,
  PostEntity,
} from '../domain/post.model';
import {
  CreatePostData,
  FindPostsOptions,
  PostsRepository,
  UpdatePostData,
} from './posts.repository';

interface PostRow {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  categoryDescription: string | null;
  categoryPostCount: number | null;
  categoryCreatedAt: Date | null;
  categoryUpdatedAt: Date | null;
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  authorImage: string | null;
}

interface PostTagRow {
  postId: string;
  tagId: string | null;
  tagName: string | null;
  tagSlug: string | null;
  tagPostCount: number | null;
  tagCreatedAt: Date | null;
  tagUpdatedAt: Date | null;
}

@Injectable()
export class DrizzlePostsRepository implements PostsRepository {
  async findMany(options: FindPostsOptions): Promise<PaginatedPostResult> {
    const {
      page,
      limit,
      sort,
      order,
      published,
      categoryId,
      tagId,
      search,
      authorId,
    } = options;

    const offset = (page - 1) * limit;

    const whereConditions: any[] = [];

    if (published !== undefined) {
      whereConditions.push(eq(posts.published, published));
    }

    if (categoryId) {
      whereConditions.push(eq(posts.categoryId, categoryId));
    }

    if (authorId) {
      whereConditions.push(eq(posts.authorId, authorId));
    }

    if (search?.trim()) {
      const trimmed = search.trim();
      whereConditions.push(
        or(
          ilike(posts.title, `%${trimmed}%`),
          ilike(posts.content, `%${trimmed}%`),
          ilike(posts.excerpt, `%${trimmed}%`),
        ),
      );
    }

    const orderDirection = order === 'asc' ? asc : desc;
    let orderByExpression;

    switch (sort) {
      case 'title':
        orderByExpression = orderDirection(posts.title);
        break;
      case 'publishedAt':
        orderByExpression = orderDirection(posts.publishedAt);
        break;
      case 'updatedAt':
        orderByExpression = orderDirection(posts.updatedAt);
        break;
      case 'viewCount':
        orderByExpression = orderDirection(posts.viewCount);
        break;
      default:
        orderByExpression = orderDirection(posts.createdAt);
    }

    const selection = {
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      content: posts.content,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      published: posts.published,
      viewCount: posts.viewCount,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      categoryId: posts.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryDescription: categories.description,
      categoryPostCount: categories.postCount,
      categoryCreatedAt: categories.createdAt,
      categoryUpdatedAt: categories.updatedAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorImage: users.image,
    } satisfies Record<string, unknown>;

    const conditions = [...whereConditions];
    if (tagId) {
      conditions.push(eq(postTags.tagId, tagId));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const basePostsQuery = db
      .select(selection)
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(users, eq(posts.authorId, users.id));

    const postsQueryWithJoin = tagId
      ? basePostsQuery.innerJoin(postTags, eq(posts.id, postTags.postId))
      : basePostsQuery;

    const postsQueryWithFilters = whereClause
      ? postsQueryWithJoin.where(whereClause)
      : postsQueryWithJoin;

    const rows = (await postsQueryWithFilters
      .orderBy(orderByExpression)
      .limit(limit)
      .offset(offset)) as PostRow[];

    const baseTotalQuery = db.select({ count: count() }).from(posts);

    const totalQueryWithJoin = tagId
      ? baseTotalQuery.innerJoin(postTags, eq(posts.id, postTags.postId))
      : baseTotalQuery;

    const totalQueryWithFilters = whereClause
      ? totalQueryWithJoin.where(whereClause)
      : totalQueryWithJoin;

    const totalResult = await totalQueryWithFilters;
    const total = Number(totalResult[0]?.count ?? 0);

    const postIds = rows.map((row) => row.id);
    const tagsMap = await this.collectTagsByPostIds(postIds);

    const items = rows.map((row) =>
      this.mapRowToAggregate(row, tagsMap.get(row.id) ?? []),
    );

    return { items, total };
  }

  async findBySlug(slug: string): Promise<PostAggregate | null> {
    const selection = {
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      content: posts.content,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      published: posts.published,
      viewCount: posts.viewCount,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      publishedAt: posts.publishedAt,
      categoryId: posts.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      categoryDescription: categories.description,
      categoryPostCount: categories.postCount,
      categoryCreatedAt: categories.createdAt,
      categoryUpdatedAt: categories.updatedAt,
      authorId: posts.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorImage: users.image,
    } satisfies Record<string, unknown>;

    const rows = (await db
      .select(selection)
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.slug, slug))
      .limit(1)) as PostRow[];

    const row = rows[0];
    if (!row) {
      return null;
    }

    const tagsMap = await this.collectTagsByPostIds([row.id]);

    return this.mapRowToAggregate(row, tagsMap.get(row.id) ?? []);
  }

  async findBasicBySlug(slug: string): Promise<PostEntity | null> {
    const rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        content: posts.content,
        excerpt: posts.excerpt,
        coverImage: posts.coverImage,
        published: posts.published,
        viewCount: posts.viewCount,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
        categoryId: posts.categoryId,
        authorId: posts.authorId,
      })
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      coverImage: row.coverImage,
      published: row.published,
      viewCount: row.viewCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt,
      categoryId: row.categoryId,
      authorId: row.authorId,
    };
  }

  async findTagIdsByPostId(postId: string): Promise<string[]> {
    const rows = await db
      .select({ tagId: postTags.tagId })
      .from(postTags)
      .where(eq(postTags.postId, postId));

    return rows.map((row) => row.tagId);
  }

  async fetchSlugsByPrefix(
    prefix: string,
    excludePostId?: string,
  ): Promise<string[]> {
    const slugCondition = ilike(posts.slug, `${prefix}%`);
    const whereClause = excludePostId
      ? and(slugCondition, sql`${posts.id} <> ${excludePostId}`)
      : slugCondition;

    const rows = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(whereClause);

    return rows.map((row) => row.slug);
  }

  async findCategoryIdBySlug(slugValue: string): Promise<string | undefined> {
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slugValue))
      .limit(1);

    return rows[0]?.id ?? undefined;
  }

  async findTagIdBySlug(slugValue: string): Promise<string | undefined> {
    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slugValue))
      .limit(1);

    return rows[0]?.id ?? undefined;
  }

  async create(data: CreatePostData): Promise<PostAggregate> {
    const { tagIds, ...postData } = data;

    const created = await db.transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values({
          title: postData.title,
          slug: postData.slug,
          content: postData.content,
          excerpt: postData.excerpt ?? null,
          coverImage: postData.coverImage ?? null,
          published: postData.published,
          categoryId: postData.categoryId,
          authorId: postData.authorId,
          publishedAt: postData.published ? new Date() : null,
        })
        .returning();

      if (tagIds.length > 0) {
        const tagRelations = tagIds.map((tagId) => ({
          postId: post.id,
          tagId,
        }));

        await tx.insert(postTags).values(tagRelations);
      }

      return post;
    });

    const aggregate = await this.findBySlug(created.slug);
    if (!aggregate) {
      throw new Error('Failed to load created post');
    }

    return aggregate;
  }

  async update(postId: string, data: UpdatePostData): Promise<void> {
    const { tagIds, ...postData } = data;

    await db.transaction(async (tx) => {
      const sanitizedEntries = Object.entries(postData).filter(
        ([, value]) => value !== undefined,
      );

      if (sanitizedEntries.length > 0) {
        const sanitized = Object.fromEntries(sanitizedEntries) as Record<
          string,
          unknown
        >;

        await tx
          .update(posts)
          .set({
            ...sanitized,
            updatedAt: new Date(),
          })
          .where(eq(posts.id, postId));
      }

      if (tagIds) {
        await tx.delete(postTags).where(eq(postTags.postId, postId));

        if (tagIds.length > 0) {
          const relations = tagIds.map((tagId) => ({
            postId,
            tagId,
          }));
          await tx.insert(postTags).values(relations);
        }
      }
    });
  }

  async delete(postId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(postTags).where(eq(postTags.postId, postId));
      await tx.delete(posts).where(eq(posts.id, postId));
    });
  }

  async incrementViewCount(postId: string): Promise<number> {
    const [updated] = await db
      .update(posts)
      .set({
        viewCount: sql`${posts.viewCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId))
      .returning({ viewCount: posts.viewCount });

    return Number(updated?.viewCount ?? 0);
  }

  async categoryExists(categoryId: string): Promise<boolean> {
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    return rows.length > 0;
  }

  async findExistingTagIds(tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, tagIds));

    return rows.map((row) => row.id);
  }

  private async collectTagsByPostIds(
    postIds: string[],
  ): Promise<Map<string, PostTagRow[]>> {
    if (postIds.length === 0) {
      return new Map();
    }

    const tagRows = (await db
      .select({
        postId: postTags.postId,
        tagId: tags.id,
        tagName: tags.name,
        tagSlug: tags.slug,
        tagPostCount: tags.postCount,
        tagCreatedAt: tags.createdAt,
        tagUpdatedAt: tags.updatedAt,
      })
      .from(postTags)
      .leftJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, postIds))) as PostTagRow[];

    const map = new Map<string, PostTagRow[]>();
    tagRows.forEach((row) => {
      if (!map.has(row.postId)) {
        map.set(row.postId, []);
      }
      map.get(row.postId)!.push(row);
    });

    return map;
  }

  private mapRowToAggregate(
    row: PostRow,
    tagRows: PostTagRow[],
  ): PostAggregate {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt ?? undefined,
      coverImage: row.coverImage ?? undefined,
      published: row.published,
      viewCount: row.viewCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt ?? undefined,
      categoryId: row.categoryId!,
      authorId: row.authorId!,
      category: {
        id: row.categoryId!,
        name: row.categoryName!,
        slug: row.categorySlug!,
        description: row.categoryDescription ?? undefined,
        postCount: row.categoryPostCount ?? undefined,
        createdAt: row.categoryCreatedAt ?? undefined,
        updatedAt: row.categoryUpdatedAt ?? undefined,
      },
      author: {
        id: row.authorId!,
        name: row.authorName ?? 'Unknown',
        email: row.authorEmail ?? undefined,
        image: row.authorImage ?? undefined,
      },
      tags: tagRows
        .filter((tag) => Boolean(tag.tagId))
        .map((tag) => ({
          id: tag.tagId!,
          name: tag.tagName!,
          slug: tag.tagSlug!,
          postCount: tag.tagPostCount ?? undefined,
          createdAt: tag.tagCreatedAt ?? undefined,
          updatedAt: tag.tagUpdatedAt ?? undefined,
        })),
    };
  }
}
