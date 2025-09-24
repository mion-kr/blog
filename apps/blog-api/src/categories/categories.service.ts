import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { db, categories, posts } from '@repo/database';
import { eq, desc, asc, count, ilike, and, or } from '@repo/database';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

/**
 * 카테고리 관련 비즈니스 로직을 처리하는 서비스
 *
 * 주요 기능:
 * - 카테고리 CRUD 작업
 * - 슬러그 기반 조회
 * - 포스트 수 계산
 * - 슬러그 중복 검사
 */
@Injectable()
export class CategoriesService {
  /**
   * 카테고리 목록 조회 (페이징, 필터링, 정렬 지원)
   */
  async findAll(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
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
      const searchConditions = or(
        ilike(categories.name, `%${search.trim()}%`),
        ilike(categories.description, `%${search.trim()}%`),
      );
      if (searchConditions) {
        conditions.push(searchConditions);
      }
    }

    // 정렬 조건 설정
    const orderDirection = order === 'asc' ? asc : desc;
    let orderBy;

    switch (sort) {
      case 'name':
        orderBy = orderDirection(categories.name);
        break;
      case 'postCount':
        orderBy = orderDirection(categories.postCount);
        break;
      case 'updatedAt':
        orderBy = orderDirection(categories.updatedAt);
        break;
      default:
        orderBy = orderDirection(categories.createdAt);
    }

    // 카테고리와 실제 포스트 수를 함께 조회
    const baseQuery = db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        // 실제 포스트 수 계산 (published 포스트만)
        postCount: count(posts.id),
      })
      .from(categories)
      .leftJoin(
        posts,
        and(
          eq(categories.id, posts.categoryId),
          eq(posts.published, true), // 발행된 포스트만 카운트
        ),
      )
      .groupBy(
        categories.id,
        categories.name,
        categories.slug,
        categories.description,
        categories.createdAt,
        categories.updatedAt,
      )
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // 검색 조건이 있으면 having 절 추가 (GROUP BY 후 필터링)
    const categoriesResult =
      conditions.length > 0
        ? await baseQuery.having(and(...conditions))
        : await baseQuery;

    return categoriesResult.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      postCount: category.postCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  async findAllOld(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
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
      const searchConditions = or(
        ilike(categories.name, `%${search.trim()}%`),
        ilike(categories.description, `%${search.trim()}%`),
      );
      if (searchConditions) {
        conditions.push(searchConditions);
      }
    }

    // 정렬 조건 설정
    const orderDirection = order === 'asc' ? asc : desc;
    let orderBy;

    switch (sort) {
      case 'name':
        orderBy = orderDirection(categories.name);
        break;
      case 'postCount':
        orderBy = orderDirection(categories.postCount);
        break;
      case 'updatedAt':
        orderBy = orderDirection(categories.updatedAt);
        break;
      default:
        orderBy = orderDirection(categories.createdAt);
    }

    // 카테고리와 해당 카테고리의 포스트 수를 함께 조회
    let categoriesResult;

    if (conditions.length > 0) {
      // 검색 조건이 있는 경우
      categoriesResult = await db
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
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    } else {
      // 검색 조건이 없는 경우
      categoriesResult = await db
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
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    }

    return categoriesResult.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      postCount: category.postCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));
  }

  /**
   * 슬러그로 카테고리 상세 조회
   */
  async findOneBySlug(slug: string): Promise<CategoryResponseDto> {
    const categoryResult = await db
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
      .where(eq(categories.slug, slug))
      .limit(1);

    if (categoryResult.length === 0) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`,
      );
    }

    const category = categoryResult[0];

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? undefined,
      postCount: category.postCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * 새 카테고리 생성
   */
  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { name, slug, description } = createCategoryDto;

    // 슬러그 중복 확인
    await this.validateSlugUniqueness(slug);

    // 이름 중복 확인
    await this.validateNameUniqueness(name);

    // 카테고리 생성
    const [newCategory] = await db
      .insert(categories)
      .values({
        name,
        slug,
        description: description ?? null,
        postCount: 0, // 초기값
      })
      .returning();

    return {
      id: newCategory.id,
      name: newCategory.name,
      slug: newCategory.slug,
      description: newCategory.description ?? undefined,
      postCount: newCategory.postCount,
      createdAt: newCategory.createdAt,
      updatedAt: newCategory.updatedAt,
    };
  }

  /**
   * 카테고리 수정
   */
  async update(
    slug: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    // 기존 카테고리 확인
    const existingCategory = await this.findCategoryBySlug(slug);
    if (!existingCategory) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`,
      );
    }

    const { name, slug: newSlug, description } = updateCategoryDto;

    // 이름이 변경되는 경우 중복 확인
    if (name && name !== existingCategory.name) {
      await this.validateNameUniqueness(name);
    }

    // 슬러그가 변경되는 경우 중복 확인
    if (newSlug && newSlug !== existingCategory.slug) {
      await this.validateSlugUniqueness(newSlug);
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (newSlug !== undefined) updateData.slug = newSlug;
    if (description !== undefined) updateData.description = description;

    // 카테고리 정보 업데이트
    const [updatedCategory] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, existingCategory.id))
      .returning();

    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      slug: updatedCategory.slug,
      description: updatedCategory.description ?? undefined,
      postCount: updatedCategory.postCount,
      createdAt: updatedCategory.createdAt,
      updatedAt: updatedCategory.updatedAt,
    };
  }

  /**
   * 카테고리 삭제
   */
  async remove(slug: string): Promise<void> {
    // 카테고리 존재 확인
    const existingCategory = await this.findCategoryBySlug(slug);
    if (!existingCategory) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`,
      );
    }

    // 해당 카테고리를 사용하는 포스트가 있는지 확인
    const postsUsingCategory = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.categoryId, existingCategory.id));

    if (postsUsingCategory[0].count > 0) {
      throw new ConflictException(
        `이 카테고리를 사용하는 포스트가 ${postsUsingCategory[0].count}개 있어 삭제할 수 없습니다.`,
      );
    }

    // 카테고리 삭제
    await db.delete(categories).where(eq(categories.id, existingCategory.id));
  }

  /**
   * 카테고리의 포스트 수 업데이트
   * (포스트 생성/삭제 시 호출되는 메서드)
   */
  async updatePostCount(categoryId: string): Promise<void> {
    // 해당 카테고리의 실제 포스트 수 계산
    const postCountResult = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.categoryId, categoryId));

    const actualPostCount = postCountResult[0].count;

    // 카테고리의 postCount 필드 업데이트
    await db
      .update(categories)
      .set({
        postCount: actualPostCount,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId));
  }

  /**
   * 슬러그로 카테고리 기본 정보 조회 (내부 사용)
   */
  private async findCategoryBySlug(slug: string) {
    const result = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 슬러그 중복 확인
   */
  private async validateSlugUniqueness(slug: string): Promise<void> {
    const existingCategory = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existingCategory.length > 0) {
      throw new ConflictException(`슬러그 '${slug}'가 이미 존재합니다.`);
    }
  }

  /**
   * 이름 중복 확인
   */
  private async validateNameUniqueness(name: string): Promise<void> {
    const existingCategory = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);

    if (existingCategory.length > 0) {
      throw new ConflictException(`카테고리 이름 '${name}'이 이미 존재합니다.`);
    }
  }
}
