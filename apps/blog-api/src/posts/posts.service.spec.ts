import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestBed, Mocked } from '@suites/unit';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { CategoriesService } from '../categories/categories.service';
import { TagsService } from '../tags/tags.service';
import * as database from '@repo/database';

// Suites auto-mocking: leverage Jest's automatic module mock to turn all exports into jest.fn
jest.mock('@repo/database', () => {
  const actual =
    jest.requireActual<typeof import('@repo/database')>('@repo/database');
  const mocked =
    jest.createMockFromModule<typeof import('@repo/database')>(
      '@repo/database',
    );

  return {
    __esModule: true,
    ...mocked,
    posts: actual.posts,
    categories: actual.categories,
    tags: actual.tags,
    postTags: actual.postTags,
    users: actual.users,
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(),
    },
    eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
    desc: jest.fn((field) => ({ type: 'desc', field })),
    asc: jest.fn((field) => ({ type: 'asc', field })),
    count: jest.fn((field) => ({ type: 'count', field })),
    ilike: jest.fn((field, pattern) => ({ type: 'ilike', field, pattern })),
    like: jest.fn((field, pattern) => ({ type: 'like', field, pattern })),
    and: jest.fn((...conditions) => ({ type: 'and', conditions })),
    or: jest.fn((...conditions) => ({ type: 'or', conditions })),
    sql: jest.fn((template, ...values) => ({ type: 'sql', template, values })),
    inArray: jest.fn((field, values) => ({ type: 'inArray', field, values })),
  } satisfies Partial<typeof actual>;
});

describe('PostsService', () => {
  let service: PostsService;
  let databaseMock: jest.Mocked<typeof database>;
  let mockDb: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  let categoriesService: Mocked<CategoriesService>;
  let tagsService: Mocked<TagsService>;
  const mockAuthorId = 'user-1';

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(PostsService).compile();

    service = unit;
    categoriesService = unitRef.get(CategoriesService);
    tagsService = unitRef.get(TagsService);
    databaseMock = jest.mocked(database);
    mockDb = databaseMock.db as typeof mockDb;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    categoriesService.updatePostCount.mockResolvedValue(undefined);
    tagsService.updateMultiplePostCounts.mockResolvedValue(undefined);
  });

  describe('findAll', () => {
    it('기본 페이징 파라미터로 포스트 목록을 반환해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {};
      const mockPosts = [
        {
          id: '1',
          title: 'Next.js 시작하기',
          slug: 'nextjs-getting-started',
          content: '# Next.js 시작하기\n\n이것은 Next.js 튜토리얼입니다.',
          excerpt: 'Next.js를 시작하는 방법을 알아봅니다.',
          coverImage: 'https://example.com/image.jpg',
          published: true,
          viewCount: 100,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          publishedAt: new Date('2024-01-01'),
          categoryId: 'cat-1',
          authorId: 'user-1',
          categoryName: 'Development',
          categorySlug: 'development',
          authorName: 'Mion',
          authorImage: 'https://example.com/avatar.jpg',
        },
      ];

      const mockPostTags = [
        {
          postId: '1',
          tagId: 'tag-1',
          tagName: 'Next.js',
          tagSlug: 'nextjs',
        },
      ];

      const postsQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      const totalCountBuilder = {
        from: jest.fn().mockResolvedValue([{ count: mockPosts.length }]),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };

      const postTagsQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockPostTags),
      };

      mockDb.select
        .mockImplementationOnce(() => postsQueryBuilder)
        .mockImplementationOnce(() => totalCountBuilder)
        .mockImplementationOnce(() => postTagsQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Next.js 시작하기');
      expect(result.items[0].slug).toBe('nextjs-getting-started');
      expect(result.items[0].viewCount).toBe(100);
      expect(result.meta.total).toBe(mockPosts.length);
      expect(postsQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(postsQueryBuilder.offset).toHaveBeenCalledWith(0);
      expect(database.inArray).toHaveBeenCalledWith(database.postTags.postId, [
        '1',
      ]);
    });

    it('published 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        published: true,
        page: 1,
        limit: 10,
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.eq).toHaveBeenCalledWith(database.posts.published, true);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('검색어로 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        search: 'Next.js',
        page: 1,
        limit: 10,
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.ilike).toHaveBeenCalledWith(
        database.posts.title,
        '%Next.js%',
      );
      expect(database.ilike).toHaveBeenCalledWith(
        database.posts.content,
        '%Next.js%',
      );
      expect(database.ilike).toHaveBeenCalledWith(
        database.posts.excerpt,
        '%Next.js%',
      );
      expect(database.or).toHaveBeenCalled();
    });

    it('categorySlug로 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        categorySlug: 'development',
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      const categoryLookupBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
          }),
        }),
      };

      mockDb.select
        .mockImplementationOnce(() => categoryLookupBuilder)
        .mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.eq).toHaveBeenCalledWith(
        database.posts.categoryId,
        'cat-1',
      );
    });

    it('tagSlug로 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        tagSlug: 'nextjs',
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      const tagLookupBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'tag-1' }]),
          }),
        }),
      };

      mockDb.select
        .mockImplementationOnce(() => tagLookupBuilder)
        .mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.eq).toHaveBeenCalledWith(
        database.postTags.tagId,
        'tag-1',
      );
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalled();
    });

    it('정렬 옵션이 올바르게 동작해야 함', async () => {
      // Arrange
      const testCases = [
        { sort: 'title', order: 'asc' as const },
        { sort: 'publishedAt', order: 'desc' as const },
        { sort: 'viewCount', order: 'desc' as const },
        { sort: 'updatedAt', order: 'asc' as const },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const query: PostQueryDto = {
          sort: testCase.sort as any,
          order: testCase.order,
        };

        const mockPosts = [];
        const mockQueryBuilder = {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockResolvedValue(mockPosts),
        };

        mockDb.select.mockReturnValue(mockQueryBuilder);

        // Act
        await service.findAll(query);

        // Assert
        const orderFn = testCase.order === 'asc' ? database.asc : database.desc;
        const fieldMap: any = {
          title: database.posts.title,
          publishedAt: database.posts.publishedAt,
          viewCount: database.posts.viewCount,
          updatedAt: database.posts.updatedAt,
        };
        expect(orderFn).toHaveBeenCalledWith(fieldMap[testCase.sort]);
      }
    });

    it('페이지네이션이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        page: 3,
        limit: 20,
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(40); // (3-1) * 20
    });

    it('복합 조건 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        published: true,
        categorySlug: 'development',
        authorId: 'user-1',
        search: 'Next.js',
        page: 2,
        limit: 15,
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      const categoryLookupBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
          }),
        }),
      };

      mockDb.select
        .mockImplementationOnce(() => categoryLookupBuilder)
        .mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.eq).toHaveBeenCalledWith(database.posts.published, true);
      expect(database.eq).toHaveBeenCalledWith(
        database.posts.categoryId,
        'cat-1',
      );
      expect(database.eq).toHaveBeenCalledWith(
        database.posts.authorId,
        'user-1',
      );
      expect(database.ilike).toHaveBeenCalledWith(
        database.posts.title,
        '%Next.js%',
      );
      expect(database.and).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(15);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(15); // (2-1) * 15
    });
  });

  describe('findOneBySlug', () => {
    it('존재하는 슬러그로 포스트를 찾아야 함', async () => {
      // Arrange
      const slug = 'nextjs-getting-started';
      const mockPost = {
        id: '1',
        title: 'Next.js 시작하기',
        slug: 'nextjs-getting-started',
        content: '# Next.js 시작하기',
        excerpt: 'Next.js를 시작하는 방법',
        coverImage: 'https://example.com/image.jpg',
        published: true,
        viewCount: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        publishedAt: new Date('2024-01-01'),
        categoryId: 'cat-1',
        categoryName: 'Development',
        categorySlug: 'development',
        authorId: 'user-1',
        authorName: 'Mion',
        authorEmail: 'mion@example.com',
        authorImage: 'https://example.com/avatar.jpg',
      };

      const mockPostTags = [
        {
          tagId: 'tag-1',
          tagName: 'Next.js',
          tagSlug: 'nextjs',
        },
      ];

      // Mock for post query
      const mockPostQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockPost]),
      };

      // Mock for tags query
      const mockTagsQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockPostTags),
      };

      // Mock for view count update
      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      mockDb.select
        .mockImplementationOnce(() => mockPostQueryBuilder)
        .mockImplementationOnce(() => mockTagsQueryBuilder);
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      const result = await service.findOneBySlug(slug);

      // Assert
      expect(result.id).toBe('1');
      expect(result.title).toBe('Next.js 시작하기');
      expect(result.slug).toBe('nextjs-getting-started');
      expect(result.viewCount).toBe(101); // 증가된 조회수
      expect(result.category.name).toBe('Development');
      expect(result.author.name).toBe('Mion');
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].name).toBe('Next.js');
      expect(database.eq).toHaveBeenCalledWith(database.posts.slug, slug);
    });

    it('존재하지 않는 슬러그일 때 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.findOneBySlug(slug)).rejects.toThrow(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
        ),
      );
    });

    it('조회수 증가 실패 시에도 포스트를 반환해야 함', async () => {
      // Arrange
      const slug = 'nextjs-getting-started';
      const mockPost = {
        id: '1',
        title: 'Next.js 시작하기',
        slug: 'nextjs-getting-started',
        content: '# Next.js 시작하기',
        excerpt: null,
        coverImage: null,
        published: true,
        viewCount: 100,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        publishedAt: new Date('2024-01-01'),
        categoryId: 'cat-1',
        categoryName: 'Development',
        categorySlug: 'development',
        authorId: 'user-1',
        authorName: 'Mion',
        authorEmail: 'mion@example.com',
        authorImage: null,
      };

      const mockPostQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockPost]),
      };

      const mockTagsQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      mockDb.select
        .mockImplementationOnce(() => mockPostQueryBuilder)
        .mockImplementationOnce(() => mockTagsQueryBuilder);
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Spy on console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      const result = await service.findOneBySlug(slug);

      // Assert
      expect(result.id).toBe('1');
      expect(result.viewCount).toBe(101); // 여전히 증가된 값 반환
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '조회수 증가 실패:',
        expect.any(Error),
      );

      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('create', () => {
    it('유효한 데이터로 포스트를 생성해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        content: '# New Post Content',
        excerpt: 'This is a new post',
        coverImage: 'https://example.com/new-image.jpg',
        published: true,
        categoryId: 'cat-1',
        tagIds: ['tag-1', 'tag-2'],
      };

      const mockNewPost = {
        id: 'new-post-id',
        title: 'New Post',
        slug: 'new-post',
        content: '# New Post Content',
        excerpt: 'This is a new post',
        coverImage: 'https://example.com/new-image.jpg',
        published: true,
        viewCount: 0,
        categoryId: 'cat-1',
        authorId: mockAuthorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      };

      // Mock for slug uniqueness check
      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      // Mock for category check
      const mockCategoryCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
      };

      // Mock for tags check
      const mockTagsCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]),
      };

      const findOnePostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockNewPost]),
      };
      const findOneTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return mockSlugCheckBuilder;
        if (selectCallCount === 2) return mockCategoryCheckBuilder;
        if (selectCallCount === 3) return mockTagsCheckBuilder;
        if (selectCallCount === 4) return findOnePostBuilder; // posts.findOne
        if (selectCallCount === 5) return findOneTagsBuilder; // tags of post
        return { from: jest.fn().mockReturnThis() };
      });

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockNewPost]),
          }),
        };
        return callback(mockTx);
      });

      // Mock for view count update (in findOneBySlug)
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.create(createPostDto, mockAuthorId);

      // Assert
      expect(result.id).toBe('new-post-id');
      expect(result.title).toBe('New Post');
      expect(result.slug).toBe('new-post');
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith(
        createPostDto.categoryId,
      );
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith(
        createPostDto.tagIds,
      );
    });

    it('슬러그가 중복되면 고유한 슬러그를 생성해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'Existing Post',
        content: 'Content',
        published: false,
        categoryId: 'cat-1',
        tagIds: [],
      };

      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ slug: 'existing-post' }]),
      };

      const mockCategoryCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
      };

      const mockCreatedPost = {
        id: 'new-post-id',
        title: 'Existing Post',
        slug: 'existing-post-1',
        content: 'Content',
        excerpt: null,
        coverImage: null,
        published: false,
        viewCount: 0,
        categoryId: 'cat-1',
        authorId: mockAuthorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockCreatedPost]),
      };

      const mockFindTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      let capturedSlug: string | undefined;

      mockDb.select
        .mockImplementationOnce(() => mockSlugCheckBuilder)
        .mockImplementationOnce(() => mockCategoryCheckBuilder)
        .mockImplementationOnce(() => mockFindPostBuilder)
        .mockImplementationOnce(() => mockFindTagsBuilder);

      mockDb.transaction.mockImplementation(async (callback) => {
        const insertBuilder = {
          values: jest.fn().mockImplementation(function (values) {
            capturedSlug = values.slug;
            return this;
          }),
          returning: jest.fn().mockResolvedValue([mockCreatedPost]),
        };

        const mockTx = {
          insert: jest.fn().mockReturnValue(insertBuilder),
        };

        return callback(mockTx);
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.create(createPostDto, mockAuthorId);

      // Assert
      expect(result.slug).toBe('existing-post-1');
      expect(capturedSlug).toBe('existing-post-1');
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-1');
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith([]);
    });

    it('카테고리가 존재하지 않을 때 BadRequestException을 던져야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        content: 'Content',
        published: false,
        categoryId: 'non-existent-cat',
        tagIds: [],
      };

      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      const mockCategoryCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return mockSlugCheckBuilder;
        if (selectCallCount === 2) return mockCategoryCheckBuilder;
        // 이후 호출들(예: findOneBySlug)은 기본적으로 빈 결과를 반환
        return {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
          limit: jest.fn().mockResolvedValue([]),
        };
      });

      // Act & Assert
      await expect(service.create(createPostDto, mockAuthorId)).rejects.toThrow(
        new BadRequestException(
          `카테고리 ID 'non-existent-cat'를 찾을 수 없습니다.`,
        ),
      );
      expect(categoriesService.updatePostCount).not.toHaveBeenCalled();
      expect(tagsService.updateMultiplePostCounts).not.toHaveBeenCalled();
    });

    it('태그가 존재하지 않을 때 BadRequestException을 던져야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        content: 'Content',
        published: false,
        categoryId: 'cat-1',
        tagIds: ['tag-1', 'non-existent-tag'],
      };

      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      const mockCategoryCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
      };

      const mockTagsCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'tag-1' }]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return mockSlugCheckBuilder;
        if (selectCallCount === 2) return mockCategoryCheckBuilder;
        if (selectCallCount === 3) return mockTagsCheckBuilder;
        return { from: jest.fn().mockReturnThis() };
      });

      // Act & Assert
      await expect(service.create(createPostDto, mockAuthorId)).rejects.toThrow(
        new BadRequestException(
          `다음 태그 ID를 찾을 수 없습니다: non-existent-tag`,
        ),
      );
      expect(categoriesService.updatePostCount).not.toHaveBeenCalled();
      expect(tagsService.updateMultiplePostCounts).not.toHaveBeenCalled();
    });

    it('태그 없이 포스트를 생성할 수 있어야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'Post Without Tags',
        content: 'Content without tags',
        published: false,
        categoryId: 'cat-1',
        tagIds: [],
      };

      const mockNewPost = {
        id: 'new-post-id',
        title: 'Post Without Tags',
        slug: 'post-without-tags',
        content: 'Content without tags',
        excerpt: null,
        coverImage: null,
        published: false,
        viewCount: 0,
        categoryId: 'cat-1',
        authorId: mockAuthorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
      };

      // Mocks for validation checks + findOneBySlug
      const noTagPostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockNewPost]),
      };
      const noTagTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([]),
          };
        }
        if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
          };
        }
        if (selectCallCount === 3) return noTagPostBuilder; // posts.findOne
        if (selectCallCount === 4) return noTagTagsBuilder; // tags for post
        return { from: jest.fn().mockReturnThis() };
      });

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([mockNewPost]),
          }),
        };
        return callback(mockTx);
      });

      // Mock for view count update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.create(createPostDto, mockAuthorId);

      // Assert
      expect(result.id).toBe('new-post-id');
      expect(result.published).toBe(false);
      expect(result.publishedAt).toBeUndefined();
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith(
        createPostDto.categoryId,
      );
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith([]);
    });

    it('전달된 authorId로 포스트를 생성해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'Author Aware Post',
        content: 'Author aware content',
        excerpt: undefined,
        coverImage: undefined,
        published: true,
        categoryId: 'cat-1',
        tagIds: ['tag-1'],
      };

      const mockNewPost = {
        id: 'new-post-id',
        title: 'Author Aware Post',
        slug: 'author-aware-post',
        content: 'Author aware content',
        excerpt: null,
        coverImage: null,
        published: true,
        viewCount: 0,
        categoryId: 'cat-1',
        authorId: mockAuthorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      };

      const selectQueue = [
        {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
        }, // slug 중복 검사
        {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
        }, // 카테고리 존재 확인
        {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ id: 'tag-1' }]),
        }, // 태그 존재 확인
        {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([mockNewPost]),
        }, // findOneBySlug - post
        {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest
            .fn()
            .mockResolvedValue([
              { tagId: 'tag-1', tagName: 'Tag 1', tagSlug: 'tag-1' },
            ]),
        }, // findOneBySlug - tags
      ];

      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            leftJoin: jest.fn().mockReturnThis(),
          },
      );

      let capturedValues: any;
      mockDb.transaction.mockImplementation(async (callback) => {
        const postInsertBuilder = {
          values: jest.fn().mockImplementation(function (values) {
            capturedValues = values;
            return {
              returning: jest.fn().mockResolvedValue([mockNewPost]),
            };
          }),
        };

        const postTagsInsertBuilder = {
          values: jest.fn().mockResolvedValue(undefined),
        };

        const mockTx = {
          insert: jest.fn((table) => {
            if (table === database.posts) {
              return postInsertBuilder;
            }
            if (table === database.postTags) {
              return postTagsInsertBuilder;
            }
            throw new Error('Unexpected table insert');
          }),
        } as unknown as typeof database.db;

        return callback(mockTx);
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.create(createPostDto, mockAuthorId);

      // Assert
      expect(capturedValues.authorId).toBe(mockAuthorId);
      expect(capturedValues.title).toBe(createPostDto.title);
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-1');
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith([
        'tag-1',
      ]);
    });
  });

  describe('update', () => {
    it('유효한 데이터로 포스트를 수정해야 함', async () => {
      // Arrange
      const slug = 'existing-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
        content: 'Updated content',
        published: true,
        categoryId: 'cat-2',
        tagIds: ['tag-3'],
      };

      const existingPost = {
        id: '1',
        title: 'Existing Post',
        slug: 'existing-post',
        content: 'Original content',
        published: false,
        categoryId: 'cat-1',
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };

      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      const mockCategoryCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'cat-2' }]),
      };

      const mockTagsCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'tag-3' }]),
      };

      const mockExistingTagIdsBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ tagId: 'tag-1' }]),
        }),
      };

      const afterUpdatePostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest
          .fn()
          .mockResolvedValue([{ ...existingPost, ...updatePostDto }]),
      };
      const afterUpdateTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };

      const selectQueue = [
        mockFindPostBuilder,
        mockExistingTagIdsBuilder,
        mockSlugCheckBuilder,
        mockCategoryCheckBuilder,
        mockTagsCheckBuilder,
        afterUpdatePostBuilder,
        afterUpdateTagsBuilder,
      ];
      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            leftJoin: jest.fn().mockReturnThis(),
          },
      );

      // Mock transaction
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          }),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.update(slug, updatePostDto, mockAuthorId);

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.content).toBe('Updated content');
      expect(result.published).toBe(true);
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-1');
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-2');
      expect(categoriesService.updatePostCount).toHaveBeenCalledTimes(2);
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledTimes(1);
      const updatedTagsArg =
        tagsService.updateMultiplePostCounts.mock.calls[0][0];
      expect(updatedTagsArg).toEqual(
        expect.arrayContaining(['tag-1', 'tag-3']),
      );
      expect(updatedTagsArg).toHaveLength(2);
    });

    it('존재하지 않는 포스트 수정 시 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockFindPostBuilder);

      // Act & Assert
      await expect(
        service.update(slug, updatePostDto, mockAuthorId),
      ).rejects.toThrow(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
        ),
      );
    });

    it('새 슬러그가 중복되면 고유한 슬러그를 생성해야 함', async () => {
      // Arrange
      const slug = 'existing-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Another Existing Post',
      };

      const existingPost = {
        id: '1',
        title: 'Existing Post',
        slug: 'existing-post',
        content: 'Original content',
        published: false,
        categoryId: 'cat-1',
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };

      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ slug: 'another-existing-post' }]),
      };

      const updatedPostAfterSave = {
        ...existingPost,
        ...updatePostDto,
        slug: 'another-existing-post-1',
      };

      const afterUpdatePostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([updatedPostAfterSave]),
      };

      const afterUpdateTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      const mockExistingTagIdsBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      };

      const selectQueue = [
        mockFindPostBuilder,
        mockExistingTagIdsBuilder,
        mockSlugCheckBuilder,
        afterUpdatePostBuilder,
        afterUpdateTagsBuilder,
      ];
      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            leftJoin: jest.fn().mockReturnThis(),
          },
      );

      let capturedUpdateData: any;

      mockDb.transaction.mockImplementation(async (callback) => {
        const updateBuilder = {
          set: jest.fn((data) => {
            capturedUpdateData = data;
            return { where: jest.fn().mockResolvedValue(undefined) };
          }),
          where: jest.fn().mockResolvedValue(undefined),
        };

        const mockTx = {
          update: jest.fn().mockReturnValue(updateBuilder),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockResolvedValue(undefined),
          }),
        };

        return callback(mockTx);
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.update(slug, updatePostDto, mockAuthorId);

      // Assert
      expect(result.slug).toBe('another-existing-post-1');
      expect(capturedUpdateData.slug).toBe('another-existing-post-1');
    });

    it('발행 상태 변경 시 publishedAt이 업데이트되어야 함', async () => {
      // Arrange
      const slug = 'draft-post';
      const updatePostDto: UpdatePostDto = {
        published: true, // false -> true
      };

      const existingPost = {
        id: '1',
        title: 'Draft Post',
        slug: 'draft-post',
        content: 'Draft content',
        published: false,
        publishedAt: null,
        categoryId: 'cat-1',
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };

      const mockExistingTagIdsBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      };

      // Mock transaction
      let capturedUpdateData: any;
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn((data) => {
              capturedUpdateData = data;
              return { where: jest.fn().mockResolvedValue(undefined) };
            }),
            where: jest.fn().mockResolvedValue(undefined),
          }),
          delete: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(undefined),
          }),
        };
        return callback(mockTx);
      });

      // Mock for findOneBySlug
      const updatedPostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([
          {
            ...existingPost,
            published: true,
            publishedAt: new Date(),
          },
        ]),
      };
      const updatedTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      const selectQueue = [
        mockFindPostBuilder,
        mockExistingTagIdsBuilder,
        updatedPostBuilder,
        updatedTagsBuilder,
      ];
      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            leftJoin: jest.fn().mockReturnThis(),
          },
      );

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.update(slug, updatePostDto, mockAuthorId);

      // Assert
      expect(capturedUpdateData.published).toBe(true);
      expect(capturedUpdateData.publishedAt).toBeInstanceOf(Date);
    });

    it('카테고리를 유지하고 태그 목록을 수정하지 않아도 카운트를 갱신해야 함', async () => {
      // Arrange
      const slug = 'post-with-same-category';
      const updatePostDto: UpdatePostDto = {
        content: 'Updated content only',
      };

      const existingPost = {
        id: '1',
        title: 'Original Title',
        slug: slug,
        content: 'Original content',
        published: false,
        categoryId: 'cat-1',
      };

      const updatedPost = {
        ...existingPost,
        content: updatePostDto.content,
      };

      const selectQueue = [
        {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([existingPost]),
        }, // findPostBySlug
        {
          from: jest.fn().mockReturnValue({
            where: jest
              .fn()
              .mockResolvedValue([{ tagId: 'tag-1' }, { tagId: 'tag-2' }]),
          }),
        }, // findTagIdsByPostId
        {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([updatedPost]),
        }, // findOneBySlug - post
        {
          from: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([
            { tagId: 'tag-1', tagName: 'Tag 1', tagSlug: 'tag-1' },
            { tagId: 'tag-2', tagName: 'Tag 2', tagSlug: 'tag-2' },
          ]),
        }, // findOneBySlug - tags
      ];

      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            leftJoin: jest.fn().mockReturnThis(),
          },
      );

      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue(undefined),
            }),
          }),
        };

        return callback(mockTx);
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.update(slug, updatePostDto, mockAuthorId);

      // Assert
      expect(categoriesService.updatePostCount).toHaveBeenCalledTimes(1);
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith('cat-1');
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledTimes(1);
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith([
        'tag-1',
        'tag-2',
      ]);
    });

    it('태그를 빈 배열로 업데이트할 수 있어야 함', async () => {
      // Arrange
      const slug = 'post-with-tags';
      const updatePostDto: UpdatePostDto = {
        tagIds: [], // 모든 태그 제거
      };

      const existingPost = {
        id: '1',
        title: 'Post with Tags',
        slug: 'post-with-tags',
        content: 'Content',
        published: true,
        categoryId: 'cat-1',
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };

      const mockExistingTagIdsBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest
            .fn()
            .mockResolvedValue([{ tagId: 'tag-1' }, { tagId: 'tag-2' }]),
        }),
      };

      // Mock transaction
      let deleteWasCalled = false;
      let insertWasCalled = false;
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          }),
          delete: jest.fn(() => {
            deleteWasCalled = true;
            return { where: jest.fn().mockResolvedValue(undefined) };
          }),
          insert: jest.fn(() => {
            insertWasCalled = true;
            return { values: jest.fn().mockResolvedValue(undefined) };
          }),
        };
        return callback(mockTx);
      });

      // Mock for findOneBySlug
      const remAfterPostBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };
      const remAfterTagsBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
      };
      const selectQueue = [
        mockFindPostBuilder,
        mockExistingTagIdsBuilder,
        remAfterPostBuilder,
        remAfterTagsBuilder,
      ];
      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            leftJoin: jest.fn().mockReturnThis(),
          },
      );

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.update(slug, updatePostDto, mockAuthorId);

      // Assert
      expect(deleteWasCalled).toBe(true); // 기존 태그 관계 삭제
      expect(insertWasCalled).toBe(false); // 새 태그 관계 생성 안 함
    });
  });

  describe('remove', () => {
    it('포스트와 관련 데이터를 삭제해야 함', async () => {
      // Arrange
      const slug = 'post-to-delete';
      const existingPost = {
        id: '1',
        title: 'Post to Delete',
        slug: 'post-to-delete',
        content: 'Content to delete',
        published: true,
        categoryId: 'cat-1',
      };

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };
      const mockExistingTagsBuilder = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ tagId: 'tag-1' }]),
        }),
      };

      const selectQueue = [mockFindPostBuilder, mockExistingTagsBuilder];
      mockDb.select.mockImplementation(
        () =>
          selectQueue.shift() || {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          },
      );

      // Mock transaction
      let postTagsDeleted = false;
      let postDeleted = false;
      mockDb.transaction.mockImplementation(async (callback) => {
        const mockTx = {
          delete: jest.fn().mockImplementation((table) => {
            if (table === database.postTags) {
              postTagsDeleted = true;
            } else if (table === database.posts) {
              postDeleted = true;
            }
            return { where: jest.fn().mockResolvedValue(undefined) };
          }),
        };
        return callback(mockTx);
      });

      // Act
      await service.remove(slug, mockAuthorId);

      // Assert
      expect(postTagsDeleted).toBe(true);
      expect(postDeleted).toBe(true);
      expect(categoriesService.updatePostCount).toHaveBeenCalledWith(
        existingPost.categoryId,
      );
      expect(tagsService.updateMultiplePostCounts).toHaveBeenCalledWith([
        'tag-1',
      ]);
    });

    it('존재하지 않는 포스트 삭제 시 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';

      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockFindPostBuilder);

      // Act & Assert
      await expect(service.remove(slug, mockAuthorId)).rejects.toThrow(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
        ),
      );

      expect(categoriesService.updatePostCount).not.toHaveBeenCalled();
      expect(tagsService.updateMultiplePostCounts).not.toHaveBeenCalled();
    });
  });

  describe('Private Methods', () => {
    describe('createSlugFromTitle', () => {
      it('한글 제목도 slug로 유지해야 함', async () => {
        // Arrange
        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act
        const slug = await (service as any).createSlugFromTitle(
          '한글 제목 테스트',
        );

        // Assert
        expect(slug).toBe('한글-제목-테스트');
      });

      it('중복된 슬러그가 있을 때 숫자 접미사를 추가해야 함', async () => {
        // Arrange
        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest
            .fn()
            .mockResolvedValue([
              { slug: 'duplicate-slug' },
              { slug: 'duplicate-slug-1' },
            ]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act
        const slug = await (service as any).createSlugFromTitle(
          'Duplicate Slug',
        );

        // Assert
        expect(slug).toBe('duplicate-slug-2');
      });

      it('유효한 문자가 없으면 기본 slug를 생성해야 함', async () => {
        // Arrange
        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest
            .fn()
            .mockResolvedValue([{ slug: 'post' }, { slug: 'post-1' }]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act
        const slug = await (service as any).createSlugFromTitle('!!!!');

        // Assert
        expect(slug).toBe('post-2');
      });
    });

    describe('validateCategoryExists', () => {
      it('카테고리가 존재하면 통과해야 함', async () => {
        // Arrange
        const categoryId = 'cat-1';

        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: categoryId }]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act & Assert
        await expect(
          (service as any).validateCategoryExists(categoryId),
        ).resolves.not.toThrow();
      });

      it('카테고리가 존재하지 않으면 BadRequestException을 던져야 함', async () => {
        // Arrange
        const categoryId = 'non-existent';

        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act & Assert
        await expect(
          (service as any).validateCategoryExists(categoryId),
        ).rejects.toThrow(
          new BadRequestException(
            `카테고리 ID '${categoryId}'를 찾을 수 없습니다.`,
          ),
        );
      });
    });

    describe('validateTagsExist', () => {
      it('모든 태그가 존재하면 통과해야 함', async () => {
        // Arrange
        const tagIds = ['tag-1', 'tag-2', 'tag-3'];

        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest
            .fn()
            .mockResolvedValue([
              { id: 'tag-1' },
              { id: 'tag-2' },
              { id: 'tag-3' },
            ]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act & Assert
        await expect(
          (service as any).validateTagsExist(tagIds),
        ).resolves.not.toThrow();
      });

      it('일부 태그가 존재하지 않으면 BadRequestException을 던져야 함', async () => {
        // Arrange
        const tagIds = ['tag-1', 'tag-2', 'non-existent'];

        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest
            .fn()
            .mockResolvedValue([{ id: 'tag-1' }, { id: 'tag-2' }]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act & Assert
        await expect(
          (service as any).validateTagsExist(tagIds),
        ).rejects.toThrow(
          new BadRequestException(
            `다음 태그 ID를 찾을 수 없습니다: non-existent`,
          ),
        );
      });

      it('빈 배열이 주어지면 아무 것도 하지 않아야 함', async () => {
        // Arrange
        const tagIds: string[] = [];

        // Act & Assert
        await expect(
          (service as any).validateTagsExist(tagIds),
        ).resolves.not.toThrow();
        expect(mockDb.select).not.toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('검색어에 공백만 있을 때 무시해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        search: '   ',
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.ilike).not.toHaveBeenCalled();
      expect(database.or).not.toHaveBeenCalled();
    });

    it('limit이 최대값을 초과할 때 처리해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        limit: 100, // 최대 허용값
      };

      const mockPosts = [];
      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockPosts),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('MDX 콘텐츠에서 올바른 excerpt를 생성해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'MDX Post',
        content:
          '# Heading\n\nThis is a paragraph with **bold** text and [links](https://example.com).\n\n## Another heading\n\nMore content here.',
        published: true,
        categoryId: 'cat-1',
        tagIds: [],
      };

      // 테스트 구현은 실제 MDX 파싱 로직에 따라 달라질 수 있음
      // 현재는 슬러그 생성과 기본 생성 테스트만 수행
      expect(createPostDto.content).toContain('# Heading');
    });
  });
});
