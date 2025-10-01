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
  posts,
} from '@repo/database';

import { CategoryEntity } from '../domain/category.model';
import {
  CategoriesRepository,
  CreateCategoryData,
  FindCategoriesOptions,
  UpdateCategoryData,
} from './categories.repository';

@Injectable()
export class DrizzleCategoriesRepository implements CategoriesRepository {
  async findMany(options: FindCategoriesOptions): Promise<CategoryEntity[]> {
    const { page, limit, sort, order, search } = options;
    const offset = (page - 1) * limit;

    const orderDirection = order === 'asc' ? asc : desc;
    let orderByExpression;

    switch (sort) {
      case 'name':
        orderByExpression = orderDirection(categories.name);
        break;
      case 'postCount':
        orderByExpression = orderDirection(categories.postCount);
        break;
      case 'updatedAt':
        orderByExpression = orderDirection(categories.updatedAt);
        break;
      default:
        orderByExpression = orderDirection(categories.createdAt);
    }

    const selection = {
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(posts.id).as('postCount'),
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    } satisfies Record<string, unknown>;

    const baseQuery = db
      .select(selection)
      .from(categories)
      .leftJoin(
        posts,
        and(eq(categories.id, posts.categoryId), eq(posts.published, true)),
      )
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.createdAt,
        categories.updatedAt,
      )
      .orderBy(orderByExpression)
      .limit(limit)
      .offset(offset);

    if (search?.trim()) {
      const trimmed = search.trim();
      const result = await baseQuery.having(
        ilike(categories.name, `%${trimmed}%`),
      );
      return result.map((row) => this.mapRow(row));
    }

    const rows = await baseQuery;
    return rows.map((row) => this.mapRow(row));
  }

  async findBySlug(slugValue: string): Promise<CategoryEntity | null> {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        postCount: categories.postCount,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .where(eq(categories.slug, slugValue))
      .limit(1);

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async findById(id: string): Promise<CategoryEntity | null> {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        postCount: categories.postCount,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
      })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    const [created] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
      })
      .returning();

    await this.updatePostCount(created.id);

    const entity = await this.findById(created.id);
    if (!entity) {
      throw new Error('생성된 카테고리를 불러오지 못했습니다.');
    }

    return entity;
  }

  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    const sanitizedEntries = Object.entries(data).filter(
      ([, value]) => value !== undefined,
    );

    if (sanitizedEntries.length > 0) {
      const sanitized = Object.fromEntries(sanitizedEntries) as Record<
        string,
        unknown
      >;

      await db
        .update(categories)
        .set({
          ...sanitized,
          updatedAt: new Date(),
        })
        .where(eq(categories.id, id));
    }

    const entity = await this.findById(id);
    if (!entity) {
      throw new Error('수정된 카테고리를 불러오지 못했습니다.');
    }

    return entity;
  }

  async delete(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async existsBySlug(slugValue: string, excludeId?: string): Promise<boolean> {
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slugValue))
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
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, name))
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

  async updatePostCount(categoryId: string): Promise<void> {
    const total = await this.countPosts(categoryId);

    await db
      .update(categories)
      .set({ postCount: total, updatedAt: new Date() })
      .where(eq(categories.id, categoryId));
  }

  async countPosts(categoryId: string): Promise<number> {
    const [{ count: total } = { count: 0 }] = await db
      .select({ count: count(posts.id) })
      .from(posts)
      .where(eq(posts.categoryId, categoryId));

    return Number(total ?? 0);
  }

  private mapRow(row: any): CategoryEntity {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? undefined,
      postCount: Number(row.postCount ?? 0),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
