import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db, sql, posts, categories, tags, postTags, users } from '@repo/database';
import { eq, and, or, like, desc, asc, ilike, count, inArray } from '@repo/database';

import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { PostResponseDto } from './dto/post-response.dto';

/**
 * 포스트 관련 비즈니스 로직을 처리하는 서비스
 * 
 * 주요 기능:
 * - 포스트 CRUD 작업
 * - 조회수 증가
 * - 슬러그 기반 조회
 * - 페이징 및 필터링
 * - 관계 데이터 포함 (카테고리, 태그, 작성자)
 */
@Injectable()
export class PostsService {
  /**
   * 포스트 목록 조회 (페이징, 필터링, 정렬 지원)
   */
  async findAll(query: PostQueryDto): Promise<PostResponseDto[]> {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'desc',
      published,
      categoryId,
      tagId,
      search,
      authorId 
    } = query;

    // 페이징 계산
    const offset = (page - 1) * limit;

    // 동적 WHERE 조건 구성
    const conditions: any[] = [];

    // 1. published 상태 필터링
    if (published !== undefined) {
      conditions.push(eq(posts.published, published));
    }

    // 2. categoryId 필터링
    if (categoryId) {
      conditions.push(eq(posts.categoryId, categoryId));
    }

    // 3. authorId 필터링
    if (authorId) {
      conditions.push(eq(posts.authorId, authorId));
    }

    // 4. search 키워드 (title, content에서 검색)
    if (search?.trim()) {
      const searchConditions = or(
        ilike(posts.title, `%${search.trim()}%`),
        ilike(posts.content, `%${search.trim()}%`),
        ilike(posts.excerpt, `%${search.trim()}%`)
      );
      if (searchConditions) {
        conditions.push(searchConditions);
      }
    }

    // 5. 정렬 조건 설정
    const orderDirection = order === 'asc' ? asc : desc;
    let orderBy;
    
    switch (sort) {
      case 'title':
        orderBy = orderDirection(posts.title);
        break;
      case 'publishedAt':
        orderBy = orderDirection(posts.publishedAt);
        break;
      case 'updatedAt':
        orderBy = orderDirection(posts.updatedAt);
        break;
      case 'viewCount':
        orderBy = orderDirection(posts.viewCount);
        break;
      default:
        orderBy = orderDirection(posts.createdAt);
    }

    // 6. tagId 조건을 미리 추가
    if (tagId) {
      conditions.push(eq(postTags.tagId, tagId));
    }

    // 7. 쿼리 구성 - tagId가 있는지 없는지에 따라 다른 쿼리 구성
    let postsResult;
    
    if (tagId && conditions.length > 0) {
      // tagId가 있고 조건이 있는 경우 - innerJoin 포함
      postsResult = await db
        .select({
          // 포스트 기본 정보
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
          // 카테고리 정보
          categoryName: categories.name,
          categorySlug: categories.slug,
          // 작성자 정보
          authorName: users.name,
          authorImage: users.image,
        })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .leftJoin(users, eq(posts.authorId, users.id))
        .innerJoin(postTags, eq(posts.id, postTags.postId))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    } else if (tagId) {
      // tagId만 있고 다른 조건이 없는 경우
      postsResult = await db
        .select({
          // 포스트 기본 정보
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
          // 카테고리 정보
          categoryName: categories.name,
          categorySlug: categories.slug,
          // 작성자 정보
          authorName: users.name,
          authorImage: users.image,
        })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .leftJoin(users, eq(posts.authorId, users.id))
        .innerJoin(postTags, eq(posts.id, postTags.postId))
        .where(eq(postTags.tagId, tagId))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    } else if (conditions.length > 0) {
      // tagId가 없고 다른 조건들만 있는 경우
      postsResult = await db
        .select({
          // 포스트 기본 정보
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
          // 카테고리 정보
          categoryName: categories.name,
          categorySlug: categories.slug,
          // 작성자 정보
          authorName: users.name,
          authorImage: users.image,
        })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    } else {
      // 아무 조건이 없는 경우
      postsResult = await db
        .select({
          // 포스트 기본 정보
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
          // 카테고리 정보
          categoryName: categories.name,
          categorySlug: categories.slug,
          // 작성자 정보
          authorName: users.name,
          authorImage: users.image,
        })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .leftJoin(users, eq(posts.authorId, users.id))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);
    }

    // 8. 각 포스트의 태그 정보 조회
    const postIds = postsResult.map(post => post.id);
    const allPostTags = postIds.length > 0 ? await db
      .select({
        postId: postTags.postId,
        tagId: tags.id,
        tagName: tags.name,
        tagSlug: tags.slug,
      })
      .from(postTags)
      .leftJoin(tags, eq(postTags.tagId, tags.id))
      .where(inArray(postTags.postId, postIds)) : [];

    // 9. 포스트별 태그 그룹핑
    const postTagsMap = new Map<string, any[]>();
    allPostTags.forEach(tag => {
      if (!postTagsMap.has(tag.postId)) {
        postTagsMap.set(tag.postId, []);
      }
      if (tag.tagId) {
        postTagsMap.get(tag.postId)!.push({
          id: tag.tagId,
          name: tag.tagName!,
          slug: tag.tagSlug!,
          postCount: 0, // 기본값
          createdAt: new Date(), // 기본값
          updatedAt: new Date(), // 기본값
        });
      }
    });

    // 10. 최종 응답 데이터 구성
    return postsResult.map(post => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt ?? undefined,
      coverImage: post.coverImage ?? undefined,
      published: post.published,
      viewCount: post.viewCount,
      categoryId: post.categoryId!,
      authorId: post.authorId!,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt ?? undefined,
      category: {
        id: post.categoryId!,
        name: post.categoryName!,
        slug: post.categorySlug!,
        description: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      author: {
        id: post.authorId!,
        name: post.authorName!,
        image: post.authorImage ?? undefined,
      },
      tags: postTagsMap.get(post.id) || [],
    }));
  }

  /**
   * 슬러그로 포스트 상세 조회 및 조회수 증가
   */
  async findOneBySlug(slug: string): Promise<PostResponseDto> {
    // 포스트 상세 정보 조회 (관계 데이터 포함)
    const postResult = await db
      .select({
        // 포스트 기본 정보
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
        // 카테고리 정보
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        // 작성자 정보
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.slug, slug))
      .limit(1);

    if (postResult.length === 0) {
      throw new NotFoundException(`슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`);
    }

    const post = postResult[0];

    // 태그 정보 조회
    const postTagsWithTags = await db
      .select({
        tagId: tags.id,
        tagName: tags.name,
        tagSlug: tags.slug,
      })
      .from(postTags)
      .leftJoin(tags, eq(postTags.tagId, tags.id))
      .where(eq(postTags.postId, post.id));

    // 조회수 증가 (별도 트랜잭션으로 처리)
    try {
      await db
        .update(posts)
        .set({ 
          viewCount: sql`${posts.viewCount} + 1`,
          updatedAt: new Date() 
        })
        .where(eq(posts.id, post.id));
    } catch (error) {
      // 조회수 증가 실패는 로그만 남기고 에러를 던지지 않음
      console.warn('조회수 증가 실패:', error);
    }

    // 응답 데이터 구성
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt ?? undefined,
      coverImage: post.coverImage ?? undefined,
      published: post.published,
      viewCount: post.viewCount + 1, // 증가된 조회수 반영
      categoryId: post.categoryId!,
      authorId: post.authorId!,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt ?? undefined,
      category: {
        id: post.categoryId!,
        name: post.categoryName!,
        slug: post.categorySlug!,
        description: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      author: {
        id: post.authorId!,
        name: post.authorName!,
        image: post.authorImage ?? undefined,
      },
      tags: postTagsWithTags.map(tag => ({
        id: tag.tagId!,
        name: tag.tagName!,
        slug: tag.tagSlug!,
        postCount: 0, // 기본값 설정
        createdAt: new Date(), // 기본값 설정
        updatedAt: new Date(), // 기본값 설정
      })),
    };
  }

  /**
   * 새 포스트 생성
   */
  async create(createPostDto: CreatePostDto): Promise<PostResponseDto> {
    const { title, content, excerpt, coverImage, published, categoryId, tagIds } = createPostDto;

    // 제목에서 슬러그 생성
    const slug = this.generateSlug(title);

    // 슬러그 중복 확인
    await this.validateSlugUniqueness(slug);

    // 카테고리 존재 확인
    await this.validateCategoryExists(categoryId);

    // 태그 존재 확인
    await this.validateTagsExist(tagIds);

    // 트랜잭션으로 포스트 생성 및 태그 관계 설정
    const result = await db.transaction(async (tx) => {
      // 포스트 생성
      const [newPost] = await tx
        .insert(posts)
        .values({
          title,
          slug,
          content,
          excerpt: excerpt ?? null,
          coverImage: coverImage ?? null,
          published,
          categoryId,
          authorId: 'temp-user-id', // TODO: 실제 인증된 사용자 ID로 변경
          publishedAt: published ? new Date() : null,
        })
        .returning();

      // 태그 관계 설정
      if (tagIds.length > 0) {
        const tagRelations = tagIds.map(tagId => ({
          postId: newPost.id,
          tagId,
        }));

        await tx.insert(postTags).values(tagRelations);
      }

      return newPost;
    });

    // 생성된 포스트 상세 정보 반환
    return this.findOneBySlug(result.slug);
  }

  /**
   * 포스트 수정
   */
  async update(slug: string, updatePostDto: UpdatePostDto): Promise<PostResponseDto> {
    // 기존 포스트 확인
    const existingPost = await this.findPostBySlug(slug);
    if (!existingPost) {
      throw new NotFoundException(`슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`);
    }

    const { title, content, excerpt, coverImage, published, categoryId, tagIds } = updatePostDto;

    // 새 슬러그 생성 및 중복 확인 (제목이 변경된 경우)
    let newSlug = slug;
    if (title && title !== existingPost.title) {
      newSlug = this.generateSlug(title);
      if (newSlug !== slug) {
        await this.validateSlugUniqueness(newSlug);
      }
    }

    // 카테고리 존재 확인 (변경된 경우)
    if (categoryId && categoryId !== existingPost.categoryId) {
      await this.validateCategoryExists(categoryId);
    }

    // 태그 존재 확인 (변경된 경우)
    if (tagIds) {
      await this.validateTagsExist(tagIds);
    }

    // 트랜잭션으로 포스트 수정 및 태그 관계 업데이트
    await db.transaction(async (tx) => {
      // 포스트 정보 업데이트
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (excerpt !== undefined) updateData.excerpt = excerpt;
      if (coverImage !== undefined) updateData.coverImage = coverImage;
      if (published !== undefined) {
        updateData.published = published;
        // 발행 상태가 변경된 경우 publishedAt 업데이트
        if (published && !existingPost.published) {
          updateData.publishedAt = new Date();
        } else if (!published && existingPost.published) {
          updateData.publishedAt = null;
        }
      }
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (newSlug !== slug) updateData.slug = newSlug;

      await tx
        .update(posts)
        .set(updateData)
        .where(eq(posts.id, existingPost.id));

      // 태그 관계 업데이트 (변경된 경우만)
      if (tagIds) {
        // 기존 태그 관계 삭제
        await tx.delete(postTags).where(eq(postTags.postId, existingPost.id));

        // 새 태그 관계 생성
        if (tagIds.length > 0) {
          const tagRelations = tagIds.map(tagId => ({
            postId: existingPost.id,
            tagId,
          }));

          await tx.insert(postTags).values(tagRelations);
        }
      }
    });

    // 수정된 포스트 상세 정보 반환
    return this.findOneBySlug(newSlug);
  }

  /**
   * 포스트 삭제
   */
  async remove(slug: string): Promise<void> {
    // 포스트 존재 확인
    const existingPost = await this.findPostBySlug(slug);
    if (!existingPost) {
      throw new NotFoundException(`슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`);
    }

    // 트랜잭션으로 포스트 및 관련 데이터 삭제
    await db.transaction(async (tx) => {
      // 포스트-태그 관계 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
      await tx.delete(postTags).where(eq(postTags.postId, existingPost.id));

      // 포스트 삭제
      await tx.delete(posts).where(eq(posts.id, existingPost.id));
    });
  }

  /**
   * 슬러그로 포스트 기본 정보 조회 (내부 사용)
   */
  private async findPostBySlug(slug: string) {
    const result = await db
      .select()
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 제목에서 URL 친화적 슬러그 생성
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      // 한글 및 특수문자를 하이픈으로 변환
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * 슬러그 중복 확인
   */
  private async validateSlugUniqueness(slug: string): Promise<void> {
    const existingPost = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);

    if (existingPost.length > 0) {
      throw new ConflictException(`슬러그 '${slug}'가 이미 존재합니다.`);
    }
  }

  /**
   * 카테고리 존재 확인
   */
  private async validateCategoryExists(categoryId: string): Promise<void> {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (category.length === 0) {
      throw new BadRequestException(`카테고리 ID '${categoryId}'를 찾을 수 없습니다.`);
    }
  }

  /**
   * 태그들 존재 확인
   */
  private async validateTagsExist(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;

    const existingTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(sql`${tags.id} = ANY(${tagIds})`);

    if (existingTags.length !== tagIds.length) {
      const existingTagIds = existingTags.map(tag => tag.id);
      const missingTags = tagIds.filter(id => !existingTagIds.includes(id));
      throw new BadRequestException(`다음 태그 ID를 찾을 수 없습니다: ${missingTags.join(', ')}`);
    }
  }
}