import { Injectable } from '@nestjs/common';
import {
  and,
  count,
  db,
  eq,
  ilike,
  inArray,
  postTags,
  posts,
  tags,
} from '@repo/database';
import {
  normalizeSearch,
  resolveOffset,
  resolveOrderBy,
  resolveOrderDirection,
  resolveTotal,
} from '../../common/repositories/query-builder.util';

import { TagEntity } from '../domain/tag.model';
import {
  CreateTagData,
  FindTagsOptions,
  TagsRepository,
  UpdateTagData,
} from './tags.repository';

interface TagRow {
  id: string;
  name: string;
  slug: string;
  postCount: number | string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Drizzle 기반 태그 저장소 구현체입니다.
 */
@Injectable()
export class DrizzleTagsRepository implements TagsRepository {
  /**
   * 태그 목록을 페이징/검색/정렬 조건으로 조회합니다.
   */
  async findMany(
    options: FindTagsOptions,
  ): Promise<{ items: TagEntity[]; total: number }> {
    const { page, limit, sort, order, search } = options;
    const offset = resolveOffset(page, limit);
    const orderDirection = resolveOrderDirection(order);
    const orderByExpression = resolveOrderBy(
      sort,
      {
        name: orderDirection(tags.name),
        postCount: orderDirection(tags.postCount),
        updatedAt: orderDirection(tags.updatedAt),
        createdAt: orderDirection(tags.createdAt),
      },
      'createdAt',
    );

    const selection = {
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: count(postTags.postId).as('postCount'),
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    };

    // 공백 입력은 검색 미적용으로 통일합니다.
    const searchValue = normalizeSearch(search);
    const whereCondition = searchValue
      ? ilike(tags.name, `%${searchValue}%`)
      : undefined;

    const baseQuery = db
      .select(selection)
      .from(tags)
      .leftJoin(postTags, eq(tags.id, postTags.tagId))
      .leftJoin(
        posts,
        and(eq(postTags.postId, posts.id), eq(posts.published, true)),
      )
      .groupBy(tags.id, tags.name, tags.slug, tags.createdAt, tags.updatedAt);

    const filteredQuery = whereCondition
      ? baseQuery.where(whereCondition)
      : baseQuery;

    // 목록 조회 결과를 엔티티 형태로 정규화합니다.
    const rows = (await filteredQuery
      .orderBy(orderByExpression)
      .limit(limit)
      .offset(offset)) as TagRow[];
    const items = rows.map((row) => this.mapRow(row));

    const totalQuery = db.select({ count: count(tags.id) }).from(tags);
    const total = await resolveTotal(totalQuery, whereCondition);

    return {
      items,
      total,
    };
  }

  /**
   * 슬러그로 단일 태그를 조회합니다.
   */
  async findBySlug(slugValue: string): Promise<TagEntity | null> {
    // 슬러그 고유값으로 단건 조회를 수행합니다.
    const rows = (await db
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
      .limit(1)) as TagRow[];

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * ID로 단일 태그를 조회합니다.
   */
  async findById(id: string): Promise<TagEntity | null> {
    // 내부 참조용 ID 기반 단건 조회를 수행합니다.
    const rows = (await db
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
      .limit(1)) as TagRow[];

    const row = rows[0];
    return row ? this.mapRow(row) : null;
  }

  /**
   * 태그를 생성하고 집계 컬럼을 동기화합니다.
   */
  async create(data: CreateTagData): Promise<TagEntity> {
    // 태그 기본 레코드를 먼저 생성합니다.
    const [created] = await db
      .insert(tags)
      .values({
        name: data.name,
        slug: data.slug,
      })
      .returning();

    // 생성 직후 post_count를 실제 값으로 맞춥니다.
    await this.updatePostCount(created.id);

    const entity = await this.findById(created.id);
    if (!entity) {
      throw new Error('생성된 태그를 불러오지 못했습니다.');
    }

    return entity;
  }

  /**
   * 태그 정보를 수정합니다.
   */
  async update(id: string, data: UpdateTagData): Promise<TagEntity> {
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
        .update(tags)
        .set({
          ...sanitized,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, id));
    }

    // 수정 후 최신 상태를 재조회해 반환합니다.
    const entity = await this.findById(id);
    if (!entity) {
      throw new Error('수정된 태그를 불러오지 못했습니다.');
    }

    return entity;
  }

  /**
   * 태그를 삭제합니다.
   */
  async delete(id: string): Promise<void> {
    // 태그 ID 기준으로 단건 삭제를 수행합니다.
    await db.delete(tags).where(eq(tags.id, id));
  }

  /**
   * 슬러그 중복 여부를 확인합니다.
   */
  async existsBySlug(slugValue: string, excludeId?: string): Promise<boolean> {
    // 중복 검증은 최소 컬럼만 조회합니다.
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

  /**
   * 이름 중복 여부를 확인합니다.
   */
  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    // 이름 고유성 검증용 단건 조회입니다.
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

  /**
   * 특정 태그의 포스트 수 집계 컬럼을 갱신합니다.
   */
  async updatePostCount(tagId: string): Promise<void> {
    // 실시간 카운트를 계산해 denormalized 컬럼에 반영합니다.
    const total = await this.countPosts(tagId);

    await db
      .update(tags)
      .set({ postCount: total, updatedAt: new Date() })
      .where(eq(tags.id, tagId));
  }

  /**
   * 여러 태그의 포스트 수 집계를 한 번에 갱신합니다.
   */
  async updateMultiplePostCounts(tagIds: string[]): Promise<void> {
    // 갱신 대상이 없으면 즉시 종료합니다.
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    // 중복 태그 ID를 제거해 불필요한 업데이트를 막습니다.
    const uniqueIds = Array.from(new Set(tagIds));
    const counts = await db
      .select({
        tagId: postTags.tagId,
        count: count(postTags.postId),
      })
      .from(postTags)
      .where(inArray(postTags.tagId, uniqueIds))
      .groupBy(postTags.tagId);

    // 집계 결과를 각 태그 레코드의 post_count에 반영합니다.
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

  /**
   * 특정 태그에 연결된 포스트 수를 계산합니다.
   */
  async countPosts(tagId: string): Promise<number> {
    // 다대다 연결 테이블 기준으로 포스트 개수를 집계합니다.
    const [{ count: total } = { count: 0 }] = await db
      .select({ count: count(postTags.postId) })
      .from(postTags)
      .where(eq(postTags.tagId, tagId));

    return Number(total ?? 0);
  }

  /**
   * 조회 row를 TagEntity로 변환합니다.
   */
  private mapRow(row: TagRow): TagEntity {
    // nullable/numeric 값을 엔티티 타입으로 정규화합니다.
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
