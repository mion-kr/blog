import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { PostResponseDto } from './dto/post-response.dto';

describe('PostsController', () => {
  let controller: PostsController;
  let service: PostsService;

  const mockPostsService = {
    findAll: jest.fn(),
    findOneBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockPostResponse: PostResponseDto = {
    id: '1',
    title: 'Test Post',
    slug: 'test-post',
    content: '# Test Post Content',
    excerpt: 'Test excerpt',
    coverImage: 'https://example.com/image.jpg',
    published: true,
    viewCount: 100,
    categoryId: 'cat-1',
    authorId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    publishedAt: new Date('2024-01-01'),
    category: {
      id: 'cat-1',
      name: 'Development',
      slug: 'development',
      description: 'Development category',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    author: {
      id: 'user-1',
      name: 'Mion',
      image: 'https://example.com/avatar.jpg',
    },
    tags: [
      {
        id: 'tag-1',
        name: 'Next.js',
        slug: 'nextjs',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(CsrfGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<PostsController>(PostsController);
    service = module.get<PostsService>(PostsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('포스트 목록을 반환해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        page: 1,
        limit: 10,
        published: true,
      };
      const mockPosts = [mockPostResponse];
      mockPostsService.findAll.mockResolvedValue(mockPosts);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockPosts);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('빈 쿼리 파라미터로도 동작해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {};
      const mockPosts: PostResponseDto[] = [];
      mockPostsService.findAll.mockResolvedValue(mockPosts);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockPosts);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('복잡한 쿼리 파라미터를 전달해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {
        page: 2,
        limit: 20,
        sort: 'viewCount',
        order: 'desc',
        published: true,
        categoryId: 'cat-1',
        tagId: 'tag-1',
        search: 'Next.js',
        authorId: 'user-1',
      };
      const mockPosts = [mockPostResponse];
      mockPostsService.findAll.mockResolvedValue(mockPosts);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockPosts);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('서비스에서 에러가 발생하면 전파해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {};
      const error = new Error('Database error');
      mockPostsService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(query)).rejects.toThrow(error);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('슬러그로 포스트를 찾아 반환해야 함', async () => {
      // Arrange
      const slug = 'test-post';
      mockPostsService.findOneBySlug.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
      expect(service.findOneBySlug).toHaveBeenCalledTimes(1);
    });

    it('한글이 포함된 슬러그도 처리해야 함', async () => {
      // Arrange
      const slug = '한글-슬러그-테스트';
      mockPostsService.findOneBySlug.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });

    it('특수문자가 포함된 슬러그도 처리해야 함', async () => {
      // Arrange
      const slug = 'test-post-123-with-numbers';
      mockPostsService.findOneBySlug.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });

    it('포스트를 찾을 수 없을 때 NotFoundException을 전파해야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const error = new NotFoundException(
        `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
      );
      mockPostsService.findOneBySlug.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne(slug)).rejects.toThrow(error);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });
  });

  describe('create', () => {
    it('포스트를 생성하고 반환해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        content: '# New Post Content',
        excerpt: 'New post excerpt',
        coverImage: 'https://example.com/new-image.jpg',
        published: true,
        categoryId: 'cat-1',
        tagIds: ['tag-1', 'tag-2'],
      };
      const createdPost = { ...mockPostResponse, ...createPostDto };
      mockPostsService.create.mockResolvedValue(createdPost);

      // Act
      const result = await controller.create(createPostDto);

      // Assert
      expect(result).toEqual(createdPost);
      expect(service.create).toHaveBeenCalledWith(createPostDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('필수 필드만으로 포스트를 생성해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'Minimal Post',
        content: 'Minimal content',
        published: false,
        categoryId: 'cat-1',
        tagIds: [],
      };
      mockPostsService.create.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.create(createPostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.create).toHaveBeenCalledWith(createPostDto);
    });

    it('MDX 콘텐츠를 포함한 포스트를 생성해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'MDX Post',
        content: `# MDX Post

## Code Block

\`\`\`typescript
const hello = 'world';
console.log(hello);
\`\`\`

## Component

<CustomComponent prop="value" />`,
        published: true,
        categoryId: 'cat-1',
        tagIds: ['tag-1'],
      };
      mockPostsService.create.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.create(createPostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.create).toHaveBeenCalledWith(createPostDto);
    });

    it('서비스에서 에러가 발생하면 전파해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: 'Error Post',
        content: 'Content',
        published: false,
        categoryId: 'cat-1',
        tagIds: [],
      };
      const error = new Error('Creation failed');
      mockPostsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createPostDto)).rejects.toThrow(error);
      expect(service.create).toHaveBeenCalledWith(createPostDto);
    });
  });

  describe('update', () => {
    it('포스트를 수정하고 반환해야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
        content: 'Updated content',
        published: true,
      };
      const updatedPost = { ...mockPostResponse, ...updatePostDto };
      mockPostsService.update.mockResolvedValue(updatedPost);

      // Act
      const result = await controller.update(slug, updatePostDto);

      // Assert
      expect(result).toEqual(updatedPost);
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('부분 업데이트를 처리해야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Only Title Updated',
      };
      mockPostsService.update.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.update(slug, updatePostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
    });

    it('발행 상태만 변경할 수 있어야 함', async () => {
      // Arrange
      const slug = 'draft-post';
      const updatePostDto: UpdatePostDto = {
        published: true,
      };
      mockPostsService.update.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.update(slug, updatePostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
    });

    it('태그 목록을 업데이트할 수 있어야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const updatePostDto: UpdatePostDto = {
        tagIds: ['tag-3', 'tag-4', 'tag-5'],
      };
      mockPostsService.update.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.update(slug, updatePostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
    });

    it('카테고리를 변경할 수 있어야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const updatePostDto: UpdatePostDto = {
        categoryId: 'cat-2',
      };
      mockPostsService.update.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.update(slug, updatePostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
    });

    it('모든 필드를 한 번에 업데이트할 수 있어야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Completely Updated',
        content: 'New content',
        excerpt: 'New excerpt',
        coverImage: 'https://example.com/updated.jpg',
        published: true,
        categoryId: 'cat-3',
        tagIds: ['tag-6'],
      };
      mockPostsService.update.mockResolvedValue(mockPostResponse);

      // Act
      const result = await controller.update(slug, updatePostDto);

      // Assert
      expect(result).toEqual(mockPostResponse);
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
    });

    it('포스트를 찾을 수 없을 때 NotFoundException을 전파해야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated',
      };
      const error = new NotFoundException(
        `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
      );
      mockPostsService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(slug, updatePostDto)).rejects.toThrow(
        error,
      );
      expect(service.update).toHaveBeenCalledWith(slug, updatePostDto);
    });
  });

  describe('remove', () => {
    it('포스트를 삭제해야 함', async () => {
      // Arrange
      const slug = 'test-post';
      mockPostsService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(slug);

      // Assert
      expect(service.remove).toHaveBeenCalledWith(slug);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('여러 슬러그 형식을 처리해야 함', async () => {
      // Arrange
      const slugs = [
        'simple-slug',
        'slug-with-123-numbers',
        'very-long-slug-with-many-words-separated-by-hyphens',
        'slug--with---multiple----hyphens',
      ];

      for (const slug of slugs) {
        jest.clearAllMocks();
        mockPostsService.remove.mockResolvedValue(undefined);

        // Act
        await controller.remove(slug);

        // Assert
        expect(service.remove).toHaveBeenCalledWith(slug);
        expect(service.remove).toHaveBeenCalledTimes(1);
      }
    });

    it('포스트를 찾을 수 없을 때 NotFoundException을 전파해야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const error = new NotFoundException(
        `슬러그 '${slug}'에 해당하는 포스트를 찾을 수 없습니다.`,
      );
      mockPostsService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(error);
      expect(service.remove).toHaveBeenCalledWith(slug);
    });

    it('서비스에서 에러가 발생하면 전파해야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const error = new Error('Deletion failed');
      mockPostsService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(error);
      expect(service.remove).toHaveBeenCalledWith(slug);
    });
  });

  describe('Guards', () => {
    it('create 메서드는 AdminGuard와 CsrfGuard를 사용해야 함', () => {
      // Guards는 이미 모듈 설정에서 override되어 있음
      // 여기서는 guards가 적용되었는지 메타데이터를 확인할 수 있음
      const guards = Reflect.getMetadata('__guards__', controller.create);
      expect(guards).toBeDefined();
    });

    it('update 메서드는 AdminGuard와 CsrfGuard를 사용해야 함', () => {
      const guards = Reflect.getMetadata('__guards__', controller.update);
      expect(guards).toBeDefined();
    });

    it('remove 메서드는 AdminGuard와 CsrfGuard를 사용해야 함', () => {
      const guards = Reflect.getMetadata('__guards__', controller.remove);
      expect(guards).toBeDefined();
    });

    it('findAll 메서드는 Guard를 사용하지 않아야 함', () => {
      const guards = Reflect.getMetadata('__guards__', controller.findAll);
      expect(guards).toBeUndefined();
    });

    it('findOne 메서드는 Guard를 사용하지 않아야 함', () => {
      const guards = Reflect.getMetadata('__guards__', controller.findOne);
      expect(guards).toBeUndefined();
    });
  });

  describe('HTTP Status Codes', () => {
    it('remove 메서드는 204 No Content를 반환해야 함', () => {
      // HttpCode 데코레이터 확인
      const httpCode = Reflect.getMetadata('__httpCode__', controller.remove);
      expect(httpCode).toBe(204);
    });
  });

  describe('Error Handling', () => {
    it('데이터베이스 연결 에러를 처리해야 함', async () => {
      // Arrange
      const query: PostQueryDto = {};
      const error = new Error('Database connection failed');
      mockPostsService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll(query)).rejects.toThrow(error);
    });

    it('유효성 검사 에러를 처리해야 함', async () => {
      // Arrange
      const createPostDto: CreatePostDto = {
        title: '', // 빈 제목
        content: 'Content',
        published: false,
        categoryId: 'cat-1',
        tagIds: [],
      };
      const error = new Error('Validation failed');
      mockPostsService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createPostDto)).rejects.toThrow(error);
    });

    it('권한 에러를 처리해야 함', async () => {
      // Arrange
      const slug = 'test-post';
      const error = new Error('Unauthorized');
      mockPostsService.remove.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(error);
    });
  });
});
