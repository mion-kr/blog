import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { db, tags, postTags, posts } from '@repo/database';
import { eq, desc, asc, count, ilike, and, or } from '@repo/database';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { TagQueryDto } from './dto/tag-query.dto';

/**
 * 태그 관련 비즈니스 로직을 처리하는 서비스
 *
 * 주요 기능:
 * - 태그 CRUD 작업
 * - 슬러그 기반 조회
 * - 포스트 수 계산
 * - 슬러그 중복 검사
 */
@Injectable()
export class TagsService {
  /**
   * 태그 목록 조회 (페이징, 필터링, 정렬 지원)
   */
  async findAll(query: TagQueryDto): Promise<TagResponseDto[]> {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      search,
    } = query;

    // 페이징 계산
    const offset = (page - 1) * limit;

    // 검색 조건 설정
    const conditions: any[] = [];
    if (search?.trim()) {
      const searchConditions = ilike(tags.name, `%${search.trim()}%`);
      conditions.push(searchConditions);
    }

    // 정렬 조건 설정
    const orderDirection = order === 'asc' ? asc : desc;
    let orderBy;

    switch (sort) {
      case 'name':
        orderBy = orderDirection(tags.name);
        break;
      case 'postCount':
        orderBy = orderDirection(tags.postCount);
        break;
      case 'updatedAt':
        orderBy = orderDirection(tags.updatedAt);
        break;
      default:
        orderBy = orderDirection(tags.createdAt);
    }

    // 태그와 실제 포스트 수를 함께 조회
    const baseQuery = db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
        // 실제 포스트 수 계산 (published 포스트만)
        postCount: count(postTags.postId),
      })
      .from(tags)
      .leftJoin(postTags, eq(tags.id, postTags.tagId))
      .leftJoin(
        posts,
        and(
          eq(postTags.postId, posts.id),
          eq(posts.published, true), // 발행된 포스트만 카운트
        ),
      )
      .groupBy(tags.id, tags.name, tags.slug, tags.createdAt, tags.updatedAt)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // 검색 조건이 있으면 having 절 추가 (GROUP BY 후 필터링)
    const tagsResult =
      conditions.length > 0
        ? await baseQuery.having(and(...conditions))
        : await baseQuery;

    return tagsResult.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.postCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));
  }

  async findAllOld(query: TagQueryDto): Promise<TagResponseDto[]> {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      search,
    } = query;

    // 페이징 계산
    const offset = (page - 1) * limit;

    // 검색 조건 설정
    const conditions: any[] = [];
    if (search?.trim()) {
      const searchConditions = ilike(tags.name, `%${search.trim()}%`);
      conditions.push(searchConditions);
    }

    // 정렬 조건 설정
    const orderDirection = order === 'asc' ? asc : desc;
    let orderBy;

    switch (sort) {
      case 'name':
        orderBy = orderDirection(tags.name);
        break;
      case 'postCount':
        orderBy = orderDirection(tags.postCount);
        break;
      case 'updatedAt':
        orderBy = orderDirection(tags.updatedAt);
        break;
      default:
        orderBy = orderDirection(tags.createdAt);
    }

    // 태그와 해당 태그의 포스트 수를 함께 조회
    let tagsResult;

    if (conditions.length > 0) {
      // 검색 조건이 있는 경우
      tagsResult = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          postCount: tags.postCount,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
        })
        .from(tags)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    } else {
      // 검색 조건이 없는 경우
      tagsResult = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          postCount: tags.postCount,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
        })
        .from(tags)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    }

    return tagsResult.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.postCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    }));
  }

  /**
   * 슬러그로 태그 상세 조회
   */
  async findOneBySlug(slug: string): Promise<TagResponseDto> {
    const tagResult = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        postCount: tags.postCount,
        createdAt: tags.createdAt,
        updatedAt: tags.updatedAt,
      })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (tagResult.length === 0) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
      );
    }

    const tag = tagResult[0];

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag.postCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };
  }

  /**
   * 새 태그 생성
   */
  async create(createTagDto: CreateTagDto): Promise<TagResponseDto> {
    const { name, slug } = createTagDto;

    // 슬러그 중복 확인
    await this.validateSlugUniqueness(slug);

    // 이름 중복 확인
    await this.validateNameUniqueness(name);

    // 태그 생성
    const [newTag] = await db
      .insert(tags)
      .values({
        name,
        slug,
        postCount: 0, // 초기값
      })
      .returning();

    return {
      id: newTag.id,
      name: newTag.name,
      slug: newTag.slug,
      postCount: newTag.postCount,
      createdAt: newTag.createdAt,
      updatedAt: newTag.updatedAt,
    };
  }

  /**
   * 태그 수정
   */
  async update(
    slug: string,
    updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    // 기존 태그 확인
    const existingTag = await this.findTagBySlug(slug);
    if (!existingTag) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
      );
    }

    const { name, slug: newSlug } = updateTagDto;

    // 이름이 변경되는 경우 중복 확인
    if (name && name !== existingTag.name) {
      await this.validateNameUniqueness(name);
    }

    // 슬러그가 변경되는 경우 중복 확인
    if (newSlug && newSlug !== existingTag.slug) {
      await this.validateSlugUniqueness(newSlug);
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (newSlug !== undefined) updateData.slug = newSlug;

    // 태그 정보 업데이트
    const [updatedTag] = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, existingTag.id))
      .returning();

    return {
      id: updatedTag.id,
      name: updatedTag.name,
      slug: updatedTag.slug,
      postCount: updatedTag.postCount,
      createdAt: updatedTag.createdAt,
      updatedAt: updatedTag.updatedAt,
    };
  }

  /**
   * 태그 삭제
   */
  async remove(slug: string): Promise<void> {
    // 태그 존재 확인
    const existingTag = await this.findTagBySlug(slug);
    if (!existingTag) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
      );
    }

    // 해당 태그를 사용하는 포스트가 있는지 확인
    const postsUsingTag = await db
      .select({ count: count() })
      .from(postTags)
      .where(eq(postTags.tagId, existingTag.id));

    if (postsUsingTag[0].count > 0) {
      throw new ConflictException(
        `이 태그를 사용하는 포스트가 ${postsUsingTag[0].count}개 있어 삭제할 수 없습니다.`,
      );
    }

    // 태그 삭제
    await db.delete(tags).where(eq(tags.id, existingTag.id));
  }

  /**
   * 태그의 포스트 수 업데이트
   * (포스트에 태그 추가/제거 시 호출되는 메서드)
   */
  async updatePostCount(tagId: string): Promise<void> {
    // 해당 태그의 실제 포스트 수 계산
    const postCountResult = await db
      .select({ count: count() })
      .from(postTags)
      .where(eq(postTags.tagId, tagId));

    const actualPostCount = postCountResult[0].count;

    // 태그의 postCount 필드 업데이트
    await db
      .update(tags)
      .set({
        postCount: actualPostCount,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, tagId));
  }

  /**
   * 여러 태그의 포스트 수 일괄 업데이트
   */
  async updateMultiplePostCounts(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    // 각 태그별로 포스트 수 업데이트
    await Promise.all(tagIds.map((tagId) => this.updatePostCount(tagId)));
  }

  /**
   * 슬러그로 태그 기본 정보 조회 (내부 사용)
   */
  private async findTagBySlug(slug: string) {
    const result = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 슬러그 중복 확인
   */
  private async validateSlugUniqueness(slug: string): Promise<void> {
    const existingTag = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (existingTag.length > 0) {
      throw new ConflictException(`슬러그 '${slug}'가 이미 존재합니다.`);
    }
  }

  /**
   * 이름 중복 확인
   */
  private async validateNameUniqueness(name: string): Promise<void> {
    const existingTag = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, name))
      .limit(1);

    if (existingTag.length > 0) {
      throw new ConflictException(`태그 이름 '${name}'이 이미 존재합니다.`);
    }
  }
}
