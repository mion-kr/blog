import { Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  db,
  desc,
  eq,
  ilike,
  inArray,
  postTags,
  posts,
  tags,
} from '@repo/database';

import { TagEntity } from '../domain/tag.model';
import {
  CreateTagData,
  FindTagsOptions,
  TagsRepository,
  UpdateTagData,
} from './tags.repository';

@Injectable()
export class DrizzleTagsRepository implements TagsRepository {
  async findMany(options: FindTagsOptions): Promise<TagEntity[]> {
    const { page, limit, sort, order, search } = options;
    const offset = (page - 1) * limit;

    const orderDirection = order === 'asc' ? asc : desc;
    let orderByExpression;

    switch (sort) {
      case 'name':
        orderByExpression = orderDirection(tags.name);
        break;
      case 'postCount':
        orderByExpression = orderDirection(tags.postCount);
        break;
      case 'updatedAt':
        orderByExpression = orderDirection(tags.updatedAt);
        break;
      default:
        orderByExpression = orderDirection(tags.createdAt);
    }

    const selection = {
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: count(postTags.postId).as('postCount'),
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    } satisfies Record<string, unknown>;

    const baseQuery = db
      .select(selection)
      .from(tags)
      .leftJoin(postTags, eq(tags.id, postTags.tagId))
      .leftJoin(
        posts,
        and(eq(postTags.postId, posts.id), eq(posts.published, true)),
      )
      .groupBy(tags.id, tags.name, tags.slug, tags.createdAt, tags.updatedAt)
      .orderBy(orderByExpression)
      .limit(limit)
      .offset(offset);

    let rows;

    if (search?.trim()) {
      rows = await baseQuery.having(ilike(tags.name, `%${search.trim()}%`));
    } else {
      rows = await baseQuery;
    }

    return rows.map((row) => this.mapRow(row));
  }

  async findBySlug(slugValue: string): Promise<TagEntity | null> {
    const rows = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        postCount: tags.postCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(tags)
      .where(eq(tags.slug, slugValue))
      .limit(1);

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async findById(id: string): Promise<TagEntity | null> {
    const rows = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        postCount: tags.postCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async create(data: CreateTagData): Promise<TagEntity> {
    const [created] = await db
      .insert(tags)
      .values({
        name: data.name,
        slug: data.slug,
      })
      .returning();

    await this.updatePostCount(created.id);

    const entity = await this.findById(created.id);
    if (!entity) {
      throw new Error('생성된 태그를 불러오지 못했습니다.');
    }

    return entity;
  }

  async update(id: string, data: UpdateTagData): Promise<TagEntity> {
    const sanitizedEntries = Object.entries(data).filter(
      ([, value]) => value !== undefined,
    );

    if (sanitizedEntries.length > 0) {
      const sanitized = Object.fromEntries(sanitizedEntries) as Record<
        string,
        unknown
      >;

      await db
        .update(tags)
        .set({
          ...sanitized,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, id));
    }

    const entity = await this.findById(id);
    if (!entity) {
      throw new Error('수정된 태그를 불러오지 못했습니다.');
    }

    return entity;
  }

  async delete(id: string): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  async existsBySlug(slugValue: string, excludeId?: string): Promise<boolean> {
    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slugValue))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return false;
    }

    if (excludeId && row.id === excludeId) {
      return false;
    }

    return true;
  }

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const rows = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, name))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return false;
    }

    if (excludeId && row.id === excludeId) {
      return false;
    }

    return true;
  }

  async updatePostCount(tagId: string): Promise<void> {
    const total = await this.countPosts(tagId);

    await db
      .update(tags)
      .set({ postCount: total, updatedAt: new Date() })
      .where(eq(tags.id, tagId));
  }

  async updateMultiplePostCounts(tagIds: string[]): Promise<void> {
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    const uniqueIds = Array.from(new Set(tagIds));
    const counts = await db
      .select({
        tagId: postTags.tagId,
        count: count(postTags.postId),
      })
      .from(postTags)
      .where(inArray(postTags.tagId, uniqueIds))
      .groupBy(postTags.tagId);

    await Promise.all(
      uniqueIds.map(async (tagId) => {
        const found = counts.find((item) => item.tagId === tagId);
        const total = Number(found?.count ?? 0);
        await db
          .update(tags)
          .set({ postCount: total, updatedAt: new Date() })
          .where(eq(tags.id, tagId));
      }),
    );
  }

  async countPosts(tagId: string): Promise<number> {
    const [{ count: total } = { count: 0 }] = await db
      .select({ count: count(postTags.postId) })
      .from(postTags)
      .where(eq(postTags.tagId, tagId));

    return Number(total ?? 0);
  }

  private mapRow(row: any): TagEntity {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      postCount: Number(row.postCount ?? 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
