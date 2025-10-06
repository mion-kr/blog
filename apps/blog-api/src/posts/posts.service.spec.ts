import { BadRequestException, NotFoundException } from '@nestjs/common'
import { PostsService } from './posts.service'
import type { PostsRepository, PostSortField, SortDirection } from './repositories/posts.repository'
import type { CategoriesService } from '../categories/categories.service'
import type { TagsService } from '../tags/tags.service'
import type { PostAggregate, PaginatedPostResult, PostEntity } from './domain/post.model'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { PostQueryDto } from './dto/post-query.dto'

describe('PostsService', () => {
  let service: PostsService
  let postsRepository: jest.Mocked<PostsRepository>
  let categoriesService: jest.Mocked<CategoriesService>
  let tagsService: jest.Mocked<TagsService>

  const createPostAggregate = (overrides: Partial<PostAggregate> = {}): PostAggregate => ({
    id: overrides.id ?? 'post-1',
    title: overrides.title ?? 'Sample Post',
    slug: overrides.slug ?? 'sample-post',
    content: overrides.content ?? '# Content',
    excerpt: overrides.excerpt ?? 'excerpt',
    coverImage: overrides.coverImage ?? null,
    published: overrides.published ?? true,
    viewCount: overrides.viewCount ?? 10,
    categoryId: overrides.categoryId ?? 'cat-1',
    authorId: overrides.authorId ?? 'user-1',
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00Z'),
    publishedAt: overrides.publishedAt ?? new Date('2024-01-01T00:00:00Z'),
    category: overrides.category ?? {
      id: 'cat-1',
      name: '개발',
      slug: 'dev',
      description: null,
    },
    author: overrides.author ?? {
      id: 'user-1',
      name: '미온',
      email: 'mion@example.com',
      image: null,
    },
    tags: overrides.tags ?? [
      {
        id: 'tag-1',
        name: 'Next.js',
        slug: 'nextjs',
      },
    ],
  })

  const createPaginatedResult = (items: PostAggregate[], total = items.length): PaginatedPostResult => ({
    items,
    total,
  })

  beforeEach(() => {
    postsRepository = {
      findMany: jest.fn(),
      findBySlug: jest.fn(),
      findBasicBySlug: jest.fn(),
      findTagIdsByPostId: jest.fn(),
      fetchSlugsByPrefix: jest.fn(),
      findCategoryIdBySlug: jest.fn(),
      findTagIdBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      categoryExists: jest.fn(),
      findExistingTagIds: jest.fn(),
      incrementViewCount: jest.fn(),
    }

    categoriesService = {
      updatePostCount: jest.fn(),
    } as unknown as jest.Mocked<CategoriesService>

    tagsService = {
      updateMultiplePostCounts: jest.fn(),
    } as unknown as jest.Mocked<TagsService>

    service = new PostsService(categoriesService, tagsService, postsRepository)
  })

  describe('findAll', () => {
    it('기본 옵션으로 게시글을 조회해야 함', async () => {
      const aggregate = createPostAggregate()
      postsRepository.findMany.mockResolvedValue(createPaginatedResult([aggregate], 1))

      const result = await service.findAll({})

      expect(postsRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sort: 'createdAt' satisfies PostSortField,
        order: 'desc' satisfies SortDirection,
        published: undefined,
        categoryId: undefined,
        tagId: undefined,
        search: undefined,
        authorId: undefined,
      })
      expect(result.items).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.items[0]).toMatchObject({ id: 'post-1', title: 'Sample Post' })
    })

    it('카테고리 슬러그가 없으면 빈 결과를 반환해야 함', async () => {
      postsRepository.findCategoryIdBySlug.mockResolvedValue(undefined)

      const query: PostQueryDto = { categorySlug: 'unknown' }
      const result = await service.findAll(query)

      expect(result.items).toHaveLength(0)
      expect(result.meta.total).toBe(0)
      expect(postsRepository.findMany).not.toHaveBeenCalled()
    })

    it('태그 슬러그가 없으면 빈 결과를 반환해야 함', async () => {
      postsRepository.findCategoryIdBySlug.mockResolvedValue('cat-1')
      postsRepository.findTagIdBySlug.mockResolvedValue(undefined)

      const query: PostQueryDto = { categorySlug: 'dev', tagSlug: 'unknown' }
      const result = await service.findAll(query)

      expect(result.items).toHaveLength(0)
      expect(result.meta.total).toBe(0)
      expect(postsRepository.findMany).not.toHaveBeenCalled()
    })
  })

  describe('findOneBySlug', () => {
    it('조회수를 증가시키고 게시글을 반환해야 함', async () => {
      const aggregate = createPostAggregate({ viewCount: 10 })
      postsRepository.findBySlug.mockResolvedValue(aggregate)
      postsRepository.incrementViewCount.mockResolvedValue(11)

      const result = await service.findOneBySlug('sample-post')

      expect(postsRepository.findBySlug).toHaveBeenCalledWith('sample-post')
      expect(postsRepository.incrementViewCount).toHaveBeenCalledWith('post-1')
      expect(result.viewCount).toBe(11)
    })

    it('게시글이 없으면 NotFoundException', async () => {
      postsRepository.findBySlug.mockResolvedValue(null)

      await expect(service.findOneBySlug('missing')).rejects.toThrow(
        new NotFoundException(`슬러그 'missing'에 해당하는 포스트를 찾을 수 없습니다.`),
      )
    })
  })

  describe('create', () => {
    it('카테고리/태그 검증 후 게시글을 생성해야 함', async () => {
      const dto: CreatePostDto = {
        title: 'New Post',
        content: '# Hello',
        excerpt: 'Hello world',
        coverImage: null,
        published: true,
        categoryId: 'cat-1',
        tagIds: ['tag-1', 'tag-2'],
      }
      const aggregate = createPostAggregate({ id: 'post-new', slug: 'new-post', tagIds: undefined })

      postsRepository.categoryExists.mockResolvedValue(true)
      postsRepository.findExistingTagIds.mockResolvedValue(['tag-1', 'tag-2'])
      postsRepository.fetchSlugsByPrefix.mockResolvedValue([])
      postsRepository.create.mockResolvedValue(aggregate)

      const result = await service.create(dto, 'user-1')

      expect(postsRepository.create).toHaveBeenCalledWith({
        title: 'New Post',
        slug: 'new-post',
        content: '# Hello',
        excerpt: 'Hello world',
        coverImage: null,
        published: true,
        categoryId: 'cat-1',
        authorId: 'user-1',
        tagIds: ['tag-1', 'tag-2'],
      })
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-1')
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith(['tag-1', 'tag-2'])
      expect(result.slug).toBe('new-post')
    })

    it('카테고리가 존재하지 않으면 BadRequestException', async () => {
      postsRepository.fetchSlugsByPrefix.mockResolvedValue([])
      postsRepository.categoryExists.mockResolvedValue(false)

      await expect(
        service.create(
          {
            title: 'New',
            content: '#',
            published: true,
            categoryId: 'missing',
            tagIds: [],
          },
          'user-1',
        ),
      ).rejects.toThrow(new BadRequestException(`카테고리 ID 'missing'를 찾을 수 없습니다.`))
    })

    it('태그가 일부 존재하지 않으면 BadRequestException', async () => {
      postsRepository.fetchSlugsByPrefix.mockResolvedValue([])
      postsRepository.categoryExists.mockResolvedValue(true)
      postsRepository.findExistingTagIds.mockResolvedValue(['tag-1'])

      await expect(
        service.create(
          {
            title: 'New',
            content: '#',
            published: true,
            categoryId: 'cat-1',
            tagIds: ['tag-1', 'tag-2'],
          },
          'user-1',
        ),
      ).rejects.toThrow(
        new BadRequestException('다음 태그 ID를 찾을 수 없습니다: tag-2'),
      )
    })
  })

  describe('update', () => {
    it('게시글을 수정하고 카테고리/태그 집계를 갱신해야 함', async () => {
      const existing: PostEntity = {
        id: 'post-1',
        title: 'Old title',
        slug: 'old-title',
        content: 'old',
        excerpt: null,
        coverImage: null,
        published: false,
        viewCount: 0,
        categoryId: 'cat-old',
        authorId: 'user-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        publishedAt: null,
      }
      const updatedAggregate = createPostAggregate({ id: 'post-1', slug: 'new-title', title: 'New title', categoryId: 'cat-new' })

      postsRepository.findBasicBySlug.mockResolvedValue(existing)
      postsRepository.findTagIdsByPostId.mockResolvedValue(['tag-1'])
      postsRepository.fetchSlugsByPrefix.mockResolvedValue(['new-title'])
      postsRepository.categoryExists.mockResolvedValue(true)
      postsRepository.findExistingTagIds.mockResolvedValue(['tag-1', 'tag-2'])
      postsRepository.update.mockResolvedValue(undefined)
      postsRepository.findBySlug.mockResolvedValue(updatedAggregate)

      const dto: UpdatePostDto = {
        title: 'New title',
        published: true,
        categoryId: 'cat-new',
        tagIds: ['tag-1', 'tag-2'],
      }

      const result = await service.update('old-title', dto, 'user-1')

      expect(postsRepository.update).toHaveBeenCalled()
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-old')
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-new')
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith(
        expect.arrayContaining(['tag-1', 'tag-2']),
      )
      expect(result.title).toBe('New title')
    })

    it('존재하지 않는 포스트는 NotFoundException', async () => {
      postsRepository.findBasicBySlug.mockResolvedValue(null)

      await expect(service.update('missing', {}, 'user-1')).rejects.toThrow(
        new NotFoundException(`슬러그 'missing'에 해당하는 포스트를 찾을 수 없습니다.`),
      )
    })
  })

  describe('remove', () => {
    it('게시글을 삭제하고 카테고리/태그 집계를 갱신해야 함', async () => {
      const existing: PostEntity = {
        id: 'post-1',
        title: 'Title',
        slug: 'title',
        content: '#',
        excerpt: null,
        coverImage: null,
        published: true,
        viewCount: 0,
        categoryId: 'cat-1',
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      }

      postsRepository.findBasicBySlug.mockResolvedValue(existing)
      postsRepository.findTagIdsByPostId.mockResolvedValue(['tag-1', 'tag-2'])

      await service.remove('title', 'user-1')

      expect(postsRepository.delete).toHaveBeenCalledWith('post-1')
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-1')
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith(['tag-1', 'tag-2'])
    })

    it('존재하지 않는 포스트는 NotFoundException', async () => {
      postsRepository.findBasicBySlug.mockResolvedValue(null)

      await expect(service.remove('missing', 'user-1')).rejects.toThrow(
        new NotFoundException(`슬러그 'missing'에 해당하는 포스트를 찾을 수 없습니다.`),
      )
    })
  })
})
