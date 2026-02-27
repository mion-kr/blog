import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PaginatedData,
  PaginationMeta,
  createUniqueSlug,
  generateEnglishSlug,
  generateSlug as sharedGenerateSlug,
} from '@repo/shared';

import { CategoriesService } from '../categories/categories.service';
import { UploadsService } from '../uploads/uploads.service';
import { TagsService } from '../tags/tags.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import {
  POSTS_REPOSITORY,
  PostSortField,
  PostsRepository,
  SortDirection,
} from './repositories/posts.repository';
import { mapToPostResponse } from './application/post-response.mapper';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: PostQueryDto['sort'] = 'createdAt';
const DEFAULT_ORDER: SortDirection = 'desc';

@Injectable()
export class PostsService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly tagsService: TagsService,
    private readonly uploadsService: UploadsService,
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: PostsRepository,
  ) {}

  async findAll(query: PostQueryDto): Promise<PaginatedData<PostResponseDto>> {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
      sort,
      order,
      published,
      categorySlug,
      tagSlug,
      search,
      authorId,
    } = query;

    const sortField: PostSortField = (sort ?? DEFAULT_SORT) as PostSortField;
    const orderDirection: SortDirection = order ?? DEFAULT_ORDER;

    const categoryId = categorySlug
      ? await this.postsRepository.findCategoryIdBySlug(categorySlug)
      : undefined;

    if (categorySlug && !categoryId) {
      const meta = PaginationMeta.create(0, page, limit);
      return { items: [], meta };
    }

    const tagId = tagSlug
      ? await this.postsRepository.findTagIdBySlug(tagSlug)
      : undefined;

    if (tagSlug && !tagId) {
      const meta = PaginationMeta.create(0, page, limit);
      return { items: [], meta };
    }

    const result = await this.postsRepository.findMany({
      page,
      limit,
      sort: sortField,
      order: orderDirection,
      published,
      categoryId,
      tagId,
      search,
      authorId,
    });

    const items = result.items.map(mapToPostResponse);
    const meta = PaginationMeta.create(result.total, page, limit);

    return { items, meta };
  }

  async findOneBySlug(slug: string): Promise<PostResponseDto> {
    const post = await this.postsRepository.findBySlug(slug);

    if (!post) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
      );
    }

    let updatedViewCount = post.viewCount;

    try {
      updatedViewCount = await this.postsRepository.incrementViewCount(post.id);
      post.viewCount = updatedViewCount;
      post.updatedAt = new Date();
    } catch (error) {
      // 조회수 갱신 실패는 사용자 흐름을 막지 않음

      console.warn('조회수 증가 실패:', error);
    }

    return mapToPostResponse(post);
  }

  /**
   * 포스트를 생성하고 업로드된 썸네일/본문 이미지를 최종 경로로 확정합니다.
   */
  async create(
    createPostDto: CreatePostDto,
    authorId: string,
  ): Promise<PostResponseDto> {
    const {
      title,
      content,
      excerpt,
      coverImage,
      coverImageKey,
      published,
      categoryId,
      tagIds,
      draftUuid,
    } = createPostDto;

    const slug = await this.createSlugFromTitle(title);

    await this.ensureCategoryExists(categoryId);
    await this.ensureTagsExist(tagIds);

    const createdPost = await this.postsRepository.create({
      title,
      slug,
      content,
      excerpt: excerpt ?? null,
      coverImage: coverImage ?? null,
      published,
      categoryId,
      authorId,
      tagIds,
    });

    let shouldCleanupFinalizedCover = false;
    let finalizedCoverImage: string | null = null;
    let finalizedContentReport: { content: string; movedObjects: Array<{ destinationKey: string; sourceKey: string }> } = {
      content,
      movedObjects: [],
    };

    try {
      finalizedCoverImage = await this.uploadsService.finalizeCoverImage({
        postId: createdPost.id,
        draftUuid,
        objectKey: coverImageKey,
        type: 'thumbnail',
        currentCoverImage: coverImage ?? createdPost.coverImage ?? null,
        deleteDraftSource: false,
      });
      shouldCleanupFinalizedCover = Boolean(draftUuid && coverImageKey && finalizedCoverImage);
      finalizedContentReport =
        await this.uploadsService.finalizePostContentImagesWithReport({
        postId: createdPost.id,
        draftUuid,
        nextContent: content,
        deleteDraftSource: false,
      });
      const finalizedContent = finalizedContentReport.content;
      const finalizeUpdatePayload: { coverImage?: string | null; content?: string } = {};

      // 저장 직후 확정된 커버 이미지를 반영한다.
      if (finalizedCoverImage !== createdPost.coverImage) {
        finalizeUpdatePayload.coverImage = finalizedCoverImage ?? null;
        createdPost.coverImage = finalizedCoverImage ?? null;
      }

      // 저장 직후 확정된 본문 이미지 URL을 반영한다.
      if (finalizedContent !== createdPost.content) {
        finalizeUpdatePayload.content = finalizedContent;
        createdPost.content = finalizedContent;
      }

      if (Object.keys(finalizeUpdatePayload).length > 0) {
        await this.postsRepository.update(createdPost.id, finalizeUpdatePayload);
      }

      await this.categoriesService.updatePostCount(categoryId);
      await this.tagsService.updateMultiplePostCounts(tagIds);

      // DB 반영과 집계가 끝난 뒤에만 draft 원본 객체를 정리한다.
      const draftSourceKeys = finalizedContentReport.movedObjects.map(
        ({ sourceKey }) => sourceKey,
      );
      if (draftUuid && coverImageKey) {
        draftSourceKeys.push(coverImageKey);
      }
      await this.uploadsService.deleteObjectsByKeys(draftSourceKeys);
    } catch (error) {
      // 실패 시 이번 시도에서 생성한 목적지 객체만 보상 삭제해 orphan를 줄인다.
      const movedDestinationKeys = finalizedContentReport.movedObjects.map(
        ({ destinationKey }) => destinationKey,
      );
      await this.uploadsService.deleteObjectsByKeys(movedDestinationKeys);
      if (shouldCleanupFinalizedCover && finalizedCoverImage) {
        await this.uploadsService.deleteObjectByUrl(finalizedCoverImage);
      }

      // 생성 직후 후속 처리가 실패하면 생성된 포스트를 롤백해 실패 응답과 실제 상태를 맞춘다.
      try {
        await this.postsRepository.delete(createdPost.id);
        // 롤백 이후 카테고리/태그 집계를 재정산해 드리프트를 방지한다.
        await this.categoriesService.updatePostCount(categoryId);
        await this.tagsService.updateMultiplePostCounts(tagIds);
      } catch (rollbackError) {
        console.warn('포스트 생성 롤백 실패:', rollbackError);
      }
      throw error;
    }

    return mapToPostResponse(createdPost);
  }

  /**
   * 포스트를 수정하고 업로드된 썸네일/본문 이미지를 최종 경로로 확정합니다.
   */
  async update(
    slug: string,
    updatePostDto: UpdatePostDto,
    _actorId: string,
  ): Promise<PostResponseDto> {
    const existingPost = await this.postsRepository.findBasicBySlug(slug);

    if (!existingPost) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
      );
    }

    const existingTagIds = await this.postsRepository.findTagIdsByPostId(
      existingPost.id,
    );

    const {
      title,
      content,
      excerpt,
      coverImage,
      coverImageKey,
      published,
      categoryId,
      tagIds,
      draftUuid,
    } = updatePostDto;

    let newSlug = slug;
    if (title && title !== existingPost.title) {
      newSlug = await this.createSlugFromTitle(title, existingPost.id);
    }

    if (categoryId && categoryId !== existingPost.categoryId) {
      await this.ensureCategoryExists(categoryId);
    }

    if (tagIds) {
      await this.ensureTagsExist(tagIds);
    }

    const updatePayload = {
      title,
      content,
      excerpt: excerpt ?? null,
      coverImage: coverImage ?? null,
      published,
      categoryId,
      slug: newSlug !== slug ? newSlug : undefined,
      publishedAt:
        published === undefined
          ? undefined
          : published && !existingPost.published
            ? new Date()
            : !published && existingPost.published
              ? null
              : undefined,
      tagIds,
    };

    const nextCoverImage =
      updatePayload.coverImage !== undefined
        ? updatePayload.coverImage
        : existingPost.coverImage;
    const previousPersistedCoverImage = existingPost.coverImage ?? null;

    const finalizedCoverImage = await this.uploadsService.finalizeCoverImage({
      postId: existingPost.id,
      draftUuid,
      objectKey: coverImageKey,
      type: 'thumbnail',
      currentCoverImage: nextCoverImage ?? null,
      deleteDraftSource: false,
      removePrevious: false,
    });
    const nextContent =
      updatePayload.content !== undefined
        ? updatePayload.content
        : existingPost.content;
    const finalizedContentReport =
      await this.uploadsService.finalizePostContentImagesWithReport({
      postId: existingPost.id,
      draftUuid,
      previousContent: existingPost.content,
      nextContent,
      deleteDraftSource: false,
      removeOrphanedPrevious: false,
    });
    const finalizedContent = finalizedContentReport.content;
    const finalUpdatePayload = { ...updatePayload };

    // 수정 시 확정된 커버 이미지를 반영한다.
    if (finalizedCoverImage !== nextCoverImage) {
      finalUpdatePayload.coverImage = finalizedCoverImage ?? null;
    }

    // 수정 시 확정된 본문 이미지 URL을 반영한다.
    if (finalizedContent !== nextContent) {
      finalUpdatePayload.content = finalizedContent;
    }

    const shouldCleanupFinalizedCover = Boolean(
      draftUuid && coverImageKey && finalizedCoverImage,
    );

    try {
      await this.postsRepository.update(existingPost.id, finalUpdatePayload);
    } catch (error) {
      // DB 반영 실패 시 이번 요청에서 생성한 목적지 객체만 보상 삭제한다.
      const movedDestinationKeys = finalizedContentReport.movedObjects.map(
        ({ destinationKey }) => destinationKey,
      );
      await this.uploadsService.deleteObjectsByKeys(movedDestinationKeys);
      if (shouldCleanupFinalizedCover) {
        await this.uploadsService.deleteObjectByUrl(finalizedCoverImage);
      }
      throw error;
    }

    // DB 반영 이후에만 draft 원본을 정리해 재시도 가능성을 보장한다.
    const draftSourceKeys = finalizedContentReport.movedObjects.map(
      ({ sourceKey }) => sourceKey,
    );
    if (draftUuid && coverImageKey) {
      draftSourceKeys.push(coverImageKey);
    }
    await this.uploadsService.deleteObjectsByKeys(draftSourceKeys);

    // DB 반영이 끝난 뒤에만 기존 커버 이미지를 정리해 정합성을 보장한다.
    if (
      previousPersistedCoverImage &&
      finalizedCoverImage !== previousPersistedCoverImage
    ) {
      await this.uploadsService.deleteObjectByUrl(previousPersistedCoverImage);
    }

    // DB 반영이 끝난 뒤에만 본문에서 제거된 기존 content 이미지를 정리한다.
    await this.uploadsService.cleanupRemovedPostContentImages({
      postId: existingPost.id,
      previousContent: existingPost.content,
      nextContent: finalizedContent,
    });

    const categoriesToUpdate = new Set<string>();
    categoriesToUpdate.add(existingPost.categoryId);
    categoriesToUpdate.add(categoryId ?? existingPost.categoryId);

    await Promise.all(
      Array.from(categoriesToUpdate).map((category) =>
        this.categoriesService.updatePostCount(category),
      ),
    );

    if (tagIds) {
      const tagsToUpdate = new Set<string>(existingTagIds);
      tagIds.forEach((tagId) => tagsToUpdate.add(tagId));
      await this.tagsService.updateMultiplePostCounts(Array.from(tagsToUpdate));
    }

    const updatedPost = await this.postsRepository.findBySlug(newSlug);
    if (!updatedPost) {
      throw new NotFoundException('수정된 포스트를 불러오지 못했습니다.');
    }

    return mapToPostResponse(updatedPost);
  }

  async remove(slug: string, _actorId: string): Promise<void> {
    const existingPost = await this.postsRepository.findBasicBySlug(slug);
    if (!existingPost) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
      );
    }

    const existingTagIds = await this.postsRepository.findTagIdsByPostId(
      existingPost.id,
    );

    await this.postsRepository.delete(existingPost.id);

    await this.categoriesService.updatePostCount(existingPost.categoryId);
    if (existingTagIds.length > 0) {
      await this.tagsService.updateMultiplePostCounts(existingTagIds);
    }
  }

  private async createSlugFromTitle(
    title: string,
    excludePostId?: string,
  ): Promise<string> {
    let baseSlug = sharedGenerateSlug(title);

    if (!baseSlug) {
      baseSlug = generateEnglishSlug(title);
    }

    if (!baseSlug) {
      baseSlug = 'post';
    }

    const existingSlugs = await this.postsRepository.fetchSlugsByPrefix(
      baseSlug,
      excludePostId,
    );

    return createUniqueSlug(baseSlug, existingSlugs);
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const exists = await this.postsRepository.categoryExists(categoryId);

    if (!exists) {
      throw new BadRequestException(
        `카테고리 ID '${categoryId}'를 찾을 수 없습니다.`,
      );
    }
  }

  private async ensureTagsExist(tagIds: string[]): Promise<void> {
    if (!tagIds || tagIds.length === 0) {
      return;
    }

    const existingTagIds =
      await this.postsRepository.findExistingTagIds(tagIds);

    if (existingTagIds.length !== tagIds.length) {
      const missingTags = tagIds.filter((id) => !existingTagIds.includes(id));
      throw new BadRequestException(
        `다음 태그 ID를 찾을 수 없습니다: ${missingTags.join(', ')}`,
      );
    }
  }
}
