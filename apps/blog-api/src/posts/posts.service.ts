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

  async create(
    createPostDto: CreatePostDto,
    authorId: string,
  ): Promise<PostResponseDto> {
    const {
      title,
      content,
      excerpt,
      coverImage,
      published,
      categoryId,
      tagIds,
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

    await this.categoriesService.updatePostCount(categoryId);
    await this.tagsService.updateMultiplePostCounts(tagIds);

    return mapToPostResponse(createdPost);
  }

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
      published,
      categoryId,
      tagIds,
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

    await this.postsRepository.update(existingPost.id, updatePayload);

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
