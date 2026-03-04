import { Injectable } from '@nestjs/common';
import {
  and,
  categories,
  count,
  db,
  eq,
  ilike,
  posts,
} from '@repo/database';
import {
  normalizeSearch,
  resolveOffset,
  resolveOrderBy,
  resolveOrderDirection,
  resolveTotal,
} from '../../common/repositories/query-builder.util';

import { CategoryEntity } from '../domain/category.model';
import {
  CategoriesRepository,
  CreateCategoryData,
  FindCategoriesOptions,
  UpdateCategoryData,
} from './categories.repository';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount: number | string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Drizzle 기반 카테고리 저장소 구현체입니다.
 */
@Injectable()
export class DrizzleCategoriesRepository implements CategoriesRepository {
  /**
   * 카테고리 목록을 페이징/검색/정렬 조건으로 조회합니다.
   */
  async findMany(
    options: FindCategoriesOptions,
  ): Promise<{ items: CategoryEntity[]; total: number }> {
    const { page, limit, sort, order, search } = options;
    const offset = resolveOffset(page, limit);
    const orderDirection = resolveOrderDirection(order);
    const orderByExpression = resolveOrderBy(
      sort,
      {
        name: orderDirection(categories.name),
        postCount: orderDirection(categories.postCount),
        updatedAt: orderDirection(categories.updatedAt),
        createdAt: orderDirection(categories.createdAt),
      },
      'createdAt',
    );

    const selection = {
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      postCount: count(posts.id).as('postCount'),
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    };

    // 공백 입력은 검색 미적용으로 통일합니다.
    const searchValue = normalizeSearch(search);
    const whereCondition = searchValue
      ? ilike(categories.name, `%${searchValue}%`)
      : undefined;

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
      );

    const filteredQuery = whereCondition
      ? baseQuery.where(whereCondition)
      : baseQuery;

    // 목록 조회 결과를 먼저 가져온 뒤 엔티티로 매핑합니다.
    const rows = (await filteredQuery
      .orderBy(orderByExpression)
      .limit(limit)
      .offset(offset)) as CategoryRow[];
    const items = rows.map((row) => this.mapRow(row));

    const totalQuery = db
      .select({ count: count(categories.id) })
      .from(categories);
    const total = await resolveTotal(totalQuery, whereCondition);

    return {
      items,
      total,
    };
  }

  /**
   * 슬러그로 단일 카테고리를 조회합니다.
   */
  async findBySlug(slugValue: string): Promise<CategoryEntity | null> {
    // 슬러그 고유값으로 단건 조회를 수행합니다.
    const rows = (await db
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
      .limit(1)) as CategoryRow[];

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * ID로 단일 카테고리를 조회합니다.
   */
  async findById(id: string): Promise<CategoryEntity | null> {
    // 내부 참조용 ID 기반 단건 조회를 수행합니다.
    const rows = (await db
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
      .limit(1)) as CategoryRow[];

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * 카테고리를 생성하고 집계 컬럼을 동기화합니다.
   */
  async create(data: CreateCategoryData): Promise<CategoryEntity> {
    // 신규 카테고리 레코드를 먼저 생성합니다.
    const [created] = await db
      .insert(categories)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
      })
      .returning();

    // 생성 직후 post_count를 현재 상태로 정규화합니다.
    await this.updatePostCount(created.id);

    const entity = await this.findById(created.id);
    if (!entity) {
      throw new Error('생성된 카테고리를 불러오지 못했습니다.');
    }

    return entity;
  }

  /**
   * 카테고리 정보를 수정합니다.
   */
  async update(id: string, data: UpdateCategoryData): Promise<CategoryEntity> {
    // `undefined` 값은 제외하고 실제 변경 필드만 반영합니다.
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

    // 수정 후 최신 상태를 재조회해 반환합니다.
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error('수정된 카테고리를 불러오지 못했습니다.');
    }

    return entity;
  }

  /**
   * 카테고리를 삭제합니다.
   */
  async delete(id: string): Promise<void> {
    // 카테고리 ID 기준으로 단건 삭제를 수행합니다.
    await db.delete(categories).where(eq(categories.id, id));
  }

  /**
   * 슬러그 중복 여부를 확인합니다.
   */
  async existsBySlug(slugValue: string, excludeId?: string): Promise<boolean> {
    // 중복 검증은 최소 컬럼만 조회해 비용을 줄입니다.
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

  /**
   * 이름 중복 여부를 확인합니다.
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    // 이름 고유성 검증용 단건 조회입니다.
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

  /**
   * 카테고리의 포스트 수 집계 컬럼을 갱신합니다.
   */
  async updatePostCount(categoryId: string): Promise<void> {
    // 실시간 카운트를 계산해 denormalized 컬럼에 반영합니다.
    const total = await this.countPosts(categoryId);

    await db
      .update(categories)
      .set({ postCount: total, updatedAt: new Date() })
      .where(eq(categories.id, categoryId));
  }

  /**
   * 검색 조건에 맞는 카테고리 총 개수를 반환합니다.
   */
  async countAll(search?: string): Promise<number> {
    const query = db.select({ count: count(categories.id) }).from(categories);

    // 검색어 정규화 결과가 있을 때만 필터를 적용합니다.
    const searchValue = normalizeSearch(search);
    if (searchValue) {
      query.where(ilike(categories.name, `%${searchValue}%`));
    }

    const [{ count: total } = { count: 0 }] = await query;
    return Number(total ?? 0);
  }

  /**
   * 특정 카테고리에 속한 포스트 수를 계산합니다.
   */
  async countPosts(categoryId: string): Promise<number> {
    // 카테고리 ID 기준으로 posts 테이블을 집계합니다.
    const [{ count: total } = { count: 0 }] = await db
      .select({ count: count(posts.id) })
      .from(posts)
      .where(eq(posts.categoryId, categoryId));

    return Number(total ?? 0);
  }

  /**
   * 조회 row를 CategoryEntity로 변환합니다.
   */
  private mapRow(row: CategoryRow): CategoryEntity {
    // nullable 컬럼과 numeric 캐스팅을 엔티티 규격으로 정규화합니다.
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
