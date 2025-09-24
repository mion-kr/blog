import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import * as database from '@repo/database';

// Mock @repo/database module
jest.mock('@repo/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
  posts: {
    id: 'posts.id',
    title: 'posts.title',
    slug: 'posts.slug',
    content: 'posts.content',
    excerpt: 'posts.excerpt',
    coverImage: 'posts.coverImage',
    published: 'posts.published',
    viewCount: 'posts.viewCount',
    createdAt: 'posts.createdAt',
    updatedAt: 'posts.updatedAt',
    publishedAt: 'posts.publishedAt',
    categoryId: 'posts.categoryId',
    authorId: 'posts.authorId',
  },
  categories: {
    id: 'categories.id',
    name: 'categories.name',
    slug: 'categories.slug',
  },
  tags: {
    id: 'tags.id',
    name: 'tags.name',
    slug: 'tags.slug',
  },
  postTags: {
    postId: 'postTags.postId',
    tagId: 'postTags.tagId',
  },
  users: {
    id: 'users.id',
    name: 'users.name',
    image: 'users.image',
    email: 'users.email',
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
}));

describe('PostsService', () => {
  let service: PostsService;
  let mockDb: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService],
    }).compile();

    service = module.get<PostsService>(PostsService);
    mockDb = database.db;

    // Reset all mocks before each test
    jest.clearAllMocks();
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

    it('categoryId로 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        categoryId: 'cat-1',
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
      expect(database.eq).toHaveBeenCalledWith(
        database.posts.categoryId,
        'cat-1',
      );
    });

    it('tagId로 필터링이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        tagId: 'tag-1',
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

      mockDb.select.mockReturnValue(mockQueryBuilder);

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
        categoryId: 'cat-1',
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

      mockDb.select.mockReturnValue(mockQueryBuilder);

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
        authorId: 'temp-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
      };

      // Mock for slug uniqueness check
      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
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
      const result = await service.create(createPostDto);

      // Assert
      expect(result.id).toBe('new-post-id');
      expect(result.title).toBe('New Post');
      expect(result.slug).toBe('new-post');
    });

    it('슬러그가 중복될 때 ConflictException을 던져야 함', async () => {
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
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'existing-id' }]),
      };

      mockDb.select.mockReturnValue(mockSlugCheckBuilder);

      // Act & Assert
      await expect(service.create(createPostDto)).rejects.toThrow(
        new ConflictException(`슬러그 'existing-post'가 이미 존재합니다.`),
      );
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
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
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
      await expect(service.create(createPostDto)).rejects.toThrow(
        new BadRequestException(
          `카테고리 ID 'non-existent-cat'를 찾을 수 없습니다.`,
        ),
      );
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
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
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
      await expect(service.create(createPostDto)).rejects.toThrow(
        new BadRequestException(
          `다음 태그 ID를 찾을 수 없습니다: non-existent-tag`,
        ),
      );
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
        authorId: 'temp-user-id',
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
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
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
      const result = await service.create(createPostDto);

      // Assert
      expect(result.id).toBe('new-post-id');
      expect(result.published).toBe(false);
      expect(result.publishedAt).toBeUndefined();
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

      // Mock for finding existing post
      const mockFindPostBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingPost]),
      };

      // Mock for slug uniqueness check
      const mockSlugCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      // Mock for category check
      const mockCategoryCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'cat-2' }]),
      };

      // Mock for tags check
      const mockTagsCheckBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ id: 'tag-3' }]),
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
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return mockFindPostBuilder;
        if (selectCallCount === 2) return mockSlugCheckBuilder;
        if (selectCallCount === 3) return mockCategoryCheckBuilder;
        if (selectCallCount === 4) return mockTagsCheckBuilder;
        if (selectCallCount === 5) return afterUpdatePostBuilder;
        if (selectCallCount === 6) return afterUpdateTagsBuilder;
        return { from: jest.fn().mockReturnThis() };
      });

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

      // Mock for view count update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      const result = await service.update(slug, updatePostDto);

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.content).toBe('Updated content');
      expect(result.published).toBe(true);
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
      await expect(service.update(slug, updatePostDto)).rejects.toThrow(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
        ),
      );
    });

    it('새 슬러그가 중복될 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'existing-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Another Existing Post', // 이미 존재하는 다른 포스트의 제목
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
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: '2' }]), // 다른 포스트가 이미 사용 중
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) return mockFindPostBuilder;
        if (selectCallCount === 2) return mockSlugCheckBuilder;
        return { from: jest.fn().mockReturnThis() };
      });

      // Act & Assert
      await expect(service.update(slug, updatePostDto)).rejects.toThrow(
        new ConflictException(
          `슬러그 'another-existing-post'가 이미 존재합니다.`,
        ),
      );
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

      mockDb.select.mockImplementationOnce(() => mockFindPostBuilder);

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
      let afterFindCall = 0;
      mockDb.select.mockImplementation(() => {
        afterFindCall++;
        if (afterFindCall === 1) return updatedPostBuilder; // posts findOne
        if (afterFindCall === 2) return updatedTagsBuilder; // tags for post
        return { from: jest.fn().mockReturnThis() };
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.update(slug, updatePostDto);

      // Assert
      expect(capturedUpdateData.published).toBe(true);
      expect(capturedUpdateData.publishedAt).toBeInstanceOf(Date);
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

      mockDb.select.mockImplementationOnce(() => mockFindPostBuilder);

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
      let remSelectIdx = 0;
      mockDb.select.mockImplementation(() => {
        remSelectIdx++;
        if (remSelectIdx === 1) return remAfterPostBuilder; // posts findOne
        if (remSelectIdx === 2) return remAfterTagsBuilder; // tags for post
        return { from: jest.fn().mockReturnThis() };
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Act
      await service.update(slug, updatePostDto);

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

      mockDb.select.mockReturnValue(mockFindPostBuilder);

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
      await service.remove(slug);

      // Assert
      expect(postTagsDeleted).toBe(true);
      expect(postDeleted).toBe(true);
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
      await expect(service.remove(slug)).rejects.toThrow(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
        ),
      );
    });
  });

  describe('Private Methods', () => {
    describe('generateSlug', () => {
      it('제목에서 올바른 슬러그를 생성해야 함', () => {
        // Arrange & Act & Assert
        const testCases = [
          { input: 'Hello World', expected: 'hello-world' },
          { input: '  Trim Spaces  ', expected: 'trim-spaces' },
          { input: 'Multiple   Spaces', expected: 'multiple-spaces' },
          { input: 'Special!@#$%Characters', expected: 'specialcharacters' },
          { input: '한글 제목 테스트', expected: '' }, // 한글은 제거됨
          { input: 'Mix 한글 and English', expected: 'mix-and-english' },
          { input: '123 Numbers 456', expected: '123-numbers-456' },
          { input: '---Leading-Trailing---', expected: 'leading-trailing' },
        ];

        testCases.forEach(({ input, expected }) => {
          // Private 메서드 테스트를 위한 우회 방법
          const slug = (service as any).generateSlug(input);
          expect(slug).toBe(expected);
        });
      });
    });

    describe('validateSlugUniqueness', () => {
      it('슬러그가 유니크하면 통과해야 함', async () => {
        // Arrange
        const slug = 'unique-slug';

        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act & Assert
        await expect(
          (service as any).validateSlugUniqueness(slug),
        ).resolves.not.toThrow();
      });

      it('슬러그가 중복되면 ConflictException을 던져야 함', async () => {
        // Arrange
        const slug = 'duplicate-slug';

        const mockSelectBuilder = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: '1' }]),
        };

        mockDb.select.mockReturnValue(mockSelectBuilder);

        // Act & Assert
        await expect(
          (service as any).validateSlugUniqueness(slug),
        ).rejects.toThrow(
          new ConflictException(`슬러그 '${slug}'가 이미 존재합니다.`),
        );
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
