import { NotFoundException } from '@nestjs/common';
import { PaginationMeta } from '@repo/shared';
import { TestBed } from '@suites/unit';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { PostResponseDto } from './dto/post-response.dto';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService;

  const mockPostResponse: PostResponseDto = {
    id: '018f1aeb-4b58-79f7-b555-725f0c602110',
    title: 'Test Post',
    slug: 'test-post',
    content: '# Test Post Content',
    excerpt: 'Test excerpt',
    coverImage: 'https://example.com/image.jpg',
    published: true,
    viewCount: 100,
    categoryId: '018f1aeb-4b58-79f7-b555-725f0c602111',
    authorId: '018f1aeb-4b58-79f7-b555-725f0c602112',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    publishedAt: new Date('2024-01-01'),
    category: {
      id: '018f1aeb-4b58-79f7-b555-725f0c602111',
      name: 'Development',
      slug: 'development',
      description: 'Development category',
      postCount: 12,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    author: {
      id: '018f1aeb-4b58-79f7-b555-725f0c602112',
      name: 'Mion',
      image: 'https://example.com/avatar.jpg',
    },
    tags: [
      {
        id: '018f1aeb-4b58-79f7-b555-725f0c602113',
        name: 'Next.js',
        slug: 'nextjs',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  };

  const mockUser = {
    id: '018f1aeb-4b58-79f7-b555-725f0c602112',
    email: 'admin@example.com',
    name: '관리자',
    role: 'ADMIN' as const,
  };

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(PostsController).compile();
    controller = unit;
    postsService = unitRef.get(PostsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('컨트롤러가 정의되어야 함', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('포스트 목록을 반환해야 함', async () => {
      const query: PostQueryDto = {
        page: 1,
        limit: 10,
        published: true,
      };
      const response = {
        items: [mockPostResponse],
        meta: PaginationMeta.create(1, 1, 10),
      };
      postsService.findAll.mockResolvedValue(response);

      const result = await controller.findAll(query);

      expect(result).toEqual(response);
      expect(postsService.findAll).toHaveBeenCalledWith(query);
    });

    it('현재 필터 계약을 서비스에 전달해야 함', async () => {
      const query: PostQueryDto = {
        page: 2,
        limit: 20,
        sort: 'viewCount',
        order: 'desc',
        published: true,
        categorySlug: 'development',
        tagSlug: 'nextjs',
        search: 'Next.js',
        authorId: mockUser.id,
      };
      const response = {
        items: [mockPostResponse],
        meta: PaginationMeta.create(1, 2, 20),
      };
      postsService.findAll.mockResolvedValue(response);

      const result = await controller.findAll(query);

      expect(result).toEqual(response);
      expect(postsService.findAll).toHaveBeenCalledWith(query);
    });

    it('서비스 에러를 전파해야 함', async () => {
      const query: PostQueryDto = {};
      const error = new Error('Database error');
      postsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(query)).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('기본적으로 조회수 증가를 활성화해야 함', async () => {
      postsService.findOneBySlug.mockResolvedValue(mockPostResponse);

      const result = await controller.findOne('test-post', undefined);

      expect(result).toEqual(mockPostResponse);
      expect(postsService.findOneBySlug).toHaveBeenCalledWith('test-post', {
        trackView: true,
      });
    });

    it('trackView=false면 조회수 증가를 비활성화해야 함', async () => {
      postsService.findOneBySlug.mockResolvedValue(mockPostResponse);

      const result = await controller.findOne('test-post', 'false');

      expect(result).toEqual(mockPostResponse);
      expect(postsService.findOneBySlug).toHaveBeenCalledWith('test-post', {
        trackView: false,
      });
    });

    it('포스트를 찾을 수 없을 때 NotFoundException을 전파해야 함', async () => {
      const error = new NotFoundException(
        "슬러그 'missing-post'에 해당하는 포스트를 찾을 수 없습니다.",
      );
      postsService.findOneBySlug.mockRejectedValue(error);

      await expect(controller.findOne('missing-post', undefined)).rejects.toThrow(
        error,
      );
    });
  });

  describe('create', () => {
    it('포스트를 생성하고 작성자 ID를 전달해야 함', async () => {
      const createPostDto: CreatePostDto = {
        title: 'New Post',
        content: '# New Post Content',
        excerpt: 'New post excerpt',
        coverImage: 'https://example.com/new-image.jpg',
        published: true,
        categoryId: '018f1aeb-4b58-79f7-b555-725f0c602111',
        tagIds: [
          '018f1aeb-4b58-79f7-b555-725f0c602113',
          '018f1aeb-4b58-79f7-b555-725f0c602114',
        ],
      };
      const createdPost = { ...mockPostResponse, ...createPostDto };
      postsService.create.mockResolvedValue(createdPost);

      const result = await controller.create(mockUser, createPostDto);

      expect(result).toEqual(createdPost);
      expect(postsService.create).toHaveBeenCalledWith(
        createPostDto,
        mockUser.id,
      );
    });
  });

  describe('update', () => {
    it('포스트를 수정하고 반환해야 함', async () => {
      const slug = 'test-post';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
        content: 'Updated content',
        published: true,
        categoryId: '018f1aeb-4b58-79f7-b555-725f0c602115',
        tagIds: ['018f1aeb-4b58-79f7-b555-725f0c602116'],
      };
      const updatedPost = { ...mockPostResponse, ...updatePostDto };
      postsService.update.mockResolvedValue(updatedPost);

      const result = await controller.update(slug, mockUser, updatePostDto);

      expect(result).toEqual(updatedPost);
      expect(postsService.update).toHaveBeenCalledWith(
        slug,
        updatePostDto,
        mockUser.id,
      );
    });
  });

  describe('remove', () => {
    it('포스트를 삭제해야 함', async () => {
      postsService.remove.mockResolvedValue(undefined);

      await controller.remove('test-post', mockUser);

      expect(postsService.remove).toHaveBeenCalledWith('test-post', mockUser.id);
    });
  });
});
