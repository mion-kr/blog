import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagQueryDto } from './dto/tag-query.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  const mockTagsService = {
    findAll: jest.fn(),
    findOneBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of tags with default pagination', async () => {
      // Arrange
      const query: TagQueryDto = {};
      const mockTags: TagResponseDto[] = [
        {
          id: '1',
          name: 'Next.js',
          slug: 'nextjs',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'React',
          slug: 'react',
          postCount: 3,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should pass search query to service', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'Next',
        page: 1,
        limit: 20,
      };
      const mockTags: TagResponseDto[] = [
        {
          id: '1',
          name: 'Next.js',
          slug: 'nextjs',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle sorting parameters', async () => {
      // Arrange
      const query: TagQueryDto = {
        sort: 'name',
        order: 'asc',
      };
      const mockTags: TagResponseDto[] = [];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith({
        sort: 'name',
        order: 'asc',
      });
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      const query: TagQueryDto = {
        page: 3,
        limit: 50,
      };
      const mockTags: TagResponseDto[] = [];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 3,
        limit: 50,
      });
    });

    it('should handle empty results', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'nonexistent',
      };
      mockTagsService.findAll.mockResolvedValue([]);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('should return a tag by slug', async () => {
      // Arrange
      const slug = 'nextjs';
      const mockTag: TagResponseDto = {
        id: '1',
        name: 'Next.js',
        slug: 'nextjs',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.findOneBySlug.mockResolvedValue(mockTag);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockTag);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
      expect(service.findOneBySlug).toHaveBeenCalledTimes(1);
    });

    it('should handle slug with special characters', async () => {
      // Arrange
      const slug = 'asp-net-core';
      const mockTag: TagResponseDto = {
        id: '1',
        name: 'ASP.NET Core',
        slug: 'asp-net-core',
        postCount: 2,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.findOneBySlug.mockResolvedValue(mockTag);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockTag);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });

    it('should propagate NotFoundException when tag not found', async () => {
      // Arrange
      const slug = 'nonexistent';
      mockTagsService.findOneBySlug.mockRejectedValue(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
        ),
      );

      // Act & Assert
      await expect(controller.findOne(slug)).rejects.toThrow(NotFoundException);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });
  });

  describe('create', () => {
    it('should create a new tag', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'TypeScript',
        slug: 'typescript',
      };
      const mockCreatedTag: TagResponseDto = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockTagsService.create.mockResolvedValue(mockCreatedTag);

      // Act
      const result = await controller.create(createTagDto);

      // Assert
      expect(result).toEqual(mockCreatedTag);
      expect(service.create).toHaveBeenCalledWith(createTagDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should handle tag with Korean name', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: '자바스크립트',
        slug: 'javascript',
      };
      const mockCreatedTag: TagResponseDto = {
        id: '1',
        name: '자바스크립트',
        slug: 'javascript',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockTagsService.create.mockResolvedValue(mockCreatedTag);

      // Act
      const result = await controller.create(createTagDto);

      // Assert
      expect(result).toEqual(mockCreatedTag);
      expect(service.create).toHaveBeenCalledWith(createTagDto);
    });

    it('should propagate ConflictException for duplicate slug', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'TypeScript',
        slug: 'typescript',
      };
      mockTagsService.create.mockRejectedValue(
        new ConflictException(`슬러그 'typescript'가 이미 존재합니다.`),
      );

      // Act & Assert
      await expect(controller.create(createTagDto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.create).toHaveBeenCalledWith(createTagDto);
    });

    it('should propagate ConflictException for duplicate name', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'TypeScript',
        slug: 'typescript-new',
      };
      mockTagsService.create.mockRejectedValue(
        new ConflictException(`태그 이름 'TypeScript'이 이미 존재합니다.`),
      );

      // Act & Assert
      await expect(controller.create(createTagDto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.create).toHaveBeenCalledWith(createTagDto);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        name: 'TypeScript Updated',
        slug: 'typescript-new',
      };
      const mockUpdatedTag: TagResponseDto = {
        id: '1',
        name: 'TypeScript Updated',
        slug: 'typescript-new',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.update.mockResolvedValue(mockUpdatedTag);

      // Act
      const result = await controller.update(slug, updateTagDto);

      // Assert
      expect(result).toEqual(mockUpdatedTag);
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('should handle partial update (name only)', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        name: 'TypeScript Updated',
      };
      const mockUpdatedTag: TagResponseDto = {
        id: '1',
        name: 'TypeScript Updated',
        slug: 'typescript',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.update.mockResolvedValue(mockUpdatedTag);

      // Act
      const result = await controller.update(slug, updateTagDto);

      // Assert
      expect(result).toEqual(mockUpdatedTag);
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
    });

    it('should handle partial update (slug only)', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        slug: 'typescript-new',
      };
      const mockUpdatedTag: TagResponseDto = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript-new',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.update.mockResolvedValue(mockUpdatedTag);

      // Act
      const result = await controller.update(slug, updateTagDto);

      // Assert
      expect(result).toEqual(mockUpdatedTag);
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
    });

    it('should propagate NotFoundException when tag not found', async () => {
      // Arrange
      const slug = 'nonexistent';
      const updateTagDto: UpdateTagDto = {
        name: 'Updated Name',
      };
      mockTagsService.update.mockRejectedValue(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
        ),
      );

      // Act & Assert
      await expect(controller.update(slug, updateTagDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
    });

    it('should propagate ConflictException for duplicate name', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        name: 'React',
      };
      mockTagsService.update.mockRejectedValue(
        new ConflictException(`태그 이름 'React'이 이미 존재합니다.`),
      );

      // Act & Assert
      await expect(controller.update(slug, updateTagDto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
    });

    it('should propagate ConflictException for duplicate slug', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        slug: 'react',
      };
      mockTagsService.update.mockRejectedValue(
        new ConflictException(`슬러그 'react'가 이미 존재합니다.`),
      );

      // Act & Assert
      await expect(controller.update(slug, updateTagDto)).rejects.toThrow(
        ConflictException,
      );
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
    });

    it('should handle empty update DTO', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {};
      const mockUpdatedTag: TagResponseDto = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.update.mockResolvedValue(mockUpdatedTag);

      // Act
      const result = await controller.update(slug, updateTagDto);

      // Assert
      expect(result).toEqual(mockUpdatedTag);
      expect(service.update).toHaveBeenCalledWith(slug, updateTagDto);
    });
  });

  describe('remove', () => {
    it('should remove a tag', async () => {
      // Arrange
      const slug = 'unused-tag';
      mockTagsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(slug);

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(slug);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('should propagate NotFoundException when tag not found', async () => {
      // Arrange
      const slug = 'nonexistent';
      mockTagsService.remove.mockRejectedValue(
        new NotFoundException(
          `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
        ),
      );

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(slug);
    });

    it('should propagate ConflictException when tag has posts', async () => {
      // Arrange
      const slug = 'used-tag';
      mockTagsService.remove.mockRejectedValue(
        new ConflictException(
          '이 태그를 사용하는 포스트가 5개 있어 삭제할 수 없습니다.',
        ),
      );

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(ConflictException);
      expect(service.remove).toHaveBeenCalledWith(slug);
    });

    it('should handle slug with special characters', async () => {
      // Arrange
      const slug = 'asp-net-core';
      mockTagsService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(slug);

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(slug);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tags with very long names', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'A'.repeat(100),
        slug: 'very-long-tag',
      };
      const mockCreatedTag: TagResponseDto = {
        id: '1',
        name: 'A'.repeat(100),
        slug: 'very-long-tag',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      mockTagsService.create.mockResolvedValue(mockCreatedTag);

      // Act
      const result = await controller.create(createTagDto);

      // Assert
      expect(result).toEqual(mockCreatedTag);
      expect(service.create).toHaveBeenCalledWith(createTagDto);
    });

    it('should handle tags with numbers in slug', async () => {
      // Arrange
      const slug = 'es2022';
      const mockTag: TagResponseDto = {
        id: '1',
        name: 'ES2022',
        slug: 'es2022',
        postCount: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };
      mockTagsService.findOneBySlug.mockResolvedValue(mockTag);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockTag);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });

    it('should handle concurrent requests properly', async () => {
      // Arrange
      const query: TagQueryDto = {};
      const mockTags: TagResponseDto[] = [];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const results = await Promise.all([
        controller.findAll(query),
        controller.findAll(query),
        controller.findAll(query),
      ]);

      // Assert
      results.forEach((result) => {
        expect(result).toEqual(mockTags);
      });
      expect(service.findAll).toHaveBeenCalledTimes(3);
    });
  });

  describe('Search Feature', () => {
    it('should handle partial name search', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'Script',
      };
      const mockTags: TagResponseDto[] = [
        {
          id: '1',
          name: 'JavaScript',
          slug: 'javascript',
          postCount: 10,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'TypeScript',
          slug: 'typescript',
          postCount: 8,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle case-insensitive search', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'NEXT',
      };
      const mockTags: TagResponseDto[] = [
        {
          id: '1',
          name: 'Next.js',
          slug: 'nextjs',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle Korean search terms', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: '자바',
      };
      const mockTags: TagResponseDto[] = [
        {
          id: '1',
          name: '자바스크립트',
          slug: 'javascript',
          postCount: 10,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should handle special characters in search', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: '.NET',
      };
      const mockTags: TagResponseDto[] = [
        {
          id: '1',
          name: '.NET Core',
          slug: 'dotnet-core',
          postCount: 3,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'ASP.NET',
          slug: 'aspnet',
          postCount: 2,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];
      mockTagsService.findAll.mockResolvedValue(mockTags);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockTags);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });
});
