import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import * as database from '@repo/database';

// Mock @repo/database module
jest.mock('@repo/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  categories: {},
  posts: {},
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  desc: jest.fn((field) => ({ type: 'desc', field })),
  asc: jest.fn((field) => ({ type: 'asc', field })),
  count: jest.fn((field) => ({ type: 'count', field })),
  ilike: jest.fn((field, pattern) => ({ type: 'ilike', field, pattern })),
  and: jest.fn((...conditions) => ({ type: 'and', conditions })),
  or: jest.fn((...conditions) => ({ type: 'or', conditions })),
}));

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockDb: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    mockDb = database.db;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('기본 페이징 파라미터로 카테고리 목록을 반환해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {};
      const mockCategories = [
        {
          id: '1',
          name: 'Tech',
          slug: 'tech',
          description: 'Technology posts',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'Travel',
          slug: 'travel',
          description: 'Travel experiences',
          postCount: 3,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
      ];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.offset.mockResolvedValue(mockCategories);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: 'Technology posts',
        postCount: 5,
        createdAt: mockCategories[0].createdAt,
        updatedAt: mockCategories[0].updatedAt,
      });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });

    it('검색어가 있을 때 필터링된 카테고리를 반환해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        search: 'Tech',
        page: 1,
        limit: 10,
      };
      const mockCategories = [
        {
          id: '1',
          name: 'Tech',
          slug: 'tech',
          description: 'Technology posts',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tech');
      expect(database.ilike).toHaveBeenCalledWith(database.categories.name, '%Tech%');
      expect(database.ilike).toHaveBeenCalledWith(database.categories.description, '%Tech%');
      expect(mockQueryBuilder.having).toHaveBeenCalled();
    });

    it('정렬 옵션이 주어졌을 때 올바르게 정렬해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        sort: 'name',
        order: 'asc',
      };
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
        having: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.asc).toHaveBeenCalledWith(database.categories.name);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
    });

    it('페이지네이션이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        page: 3,
        limit: 20,
      };
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(40); // (3-1) * 20
    });

    it('postCount로 정렬할 때 올바르게 동작해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        sort: 'postCount',
        order: 'desc',
      };
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.desc).toHaveBeenCalledWith(database.categories.postCount);
    });

    it('updatedAt로 정렬할 때 올바르게 동작해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        sort: 'updatedAt',
        order: 'asc',
      };
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.asc).toHaveBeenCalledWith(database.categories.updatedAt);
    });
  });

  describe('findOneBySlug', () => {
    it('존재하는 슬러그로 카테고리를 찾아야 함', async () => {
      // Arrange
      const slug = 'tech';
      const mockCategory = {
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: 'Technology posts',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockCategory]),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findOneBySlug(slug);

      // Assert
      expect(result).toEqual({
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: 'Technology posts',
        postCount: 5,
        createdAt: mockCategory.createdAt,
        updatedAt: mockCategory.updatedAt,
      });
      expect(database.eq).toHaveBeenCalledWith(database.categories.slug, slug);
    });

    it('존재하지 않는 슬러그일 때 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(service.findOneBySlug(slug)).rejects.toThrow(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );
    });

    it('description이 null일 때 undefined로 변환해야 함', async () => {
      // Arrange
      const slug = 'tech';
      const mockCategory = {
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: null,
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockCategory]),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findOneBySlug(slug);

      // Assert
      expect(result.description).toBeUndefined();
    });
  });

  describe('create', () => {
    it('유효한 데이터로 카테고리를 생성해야 함', async () => {
      // Arrange
      const createCategoryDto: CreateCategoryDto = {
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials',
      };
      const mockCreatedCategory = {
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Mock for uniqueness checks
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Mock for insert
      const mockInsertBuilder = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedCategory]),
      };
      mockDb.insert.mockReturnValue(mockInsertBuilder);

      // Act
      const result = await service.create(createCategoryDto);

      // Assert
      expect(result).toEqual({
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials',
        postCount: 0,
        createdAt: mockCreatedCategory.createdAt,
        updatedAt: mockCreatedCategory.updatedAt,
      });
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials',
        postCount: 0,
      });
    });

    it('description 없이 카테고리를 생성해야 함', async () => {
      // Arrange
      const createCategoryDto: CreateCategoryDto = {
        name: 'Programming',
        slug: 'programming',
      };
      const mockCreatedCategory = {
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: null,
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Mock for uniqueness checks
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Mock for insert
      const mockInsertBuilder = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedCategory]),
      };
      mockDb.insert.mockReturnValue(mockInsertBuilder);

      // Act
      const result = await service.create(createCategoryDto);

      // Assert
      expect(result.description).toBeUndefined();
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        name: 'Programming',
        slug: 'programming',
        description: null,
        postCount: 0,
      });
    });

    it('중복된 슬러그일 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const createCategoryDto: CreateCategoryDto = {
        name: 'Programming',
        slug: 'programming',
      };

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'existing-id' }]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.create(createCategoryDto)).rejects.toThrow(
        new ConflictException(`슬러그 'programming'가 이미 존재합니다.`)
      );
    });

    it('중복된 이름일 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const createCategoryDto: CreateCategoryDto = {
        name: 'Programming',
        slug: 'programming',
      };

      let callCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          callCount++;
          // First call for slug check - return empty
          if (callCount === 1) {
            return Promise.resolve([]);
          }
          // Second call for name check - return existing
          return Promise.resolve([{ id: 'existing-id' }]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.create(createCategoryDto)).rejects.toThrow(
        new ConflictException(`카테고리 이름 'Programming'이 이미 존재합니다.`)
      );
    });
  });

  describe('update', () => {
    it('유효한 데이터로 카테고리를 수정해야 함', async () => {
      // Arrange
      const slug = 'programming';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Programming Updated',
        slug: 'programming-new',
        description: 'Updated description',
      };
      const existingCategory = {
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: 'Original description',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedCategory = {
        ...existingCategory,
        name: 'Programming Updated',
        slug: 'programming-new',
        description: 'Updated description',
        updatedAt: new Date('2024-01-02'),
      };

      // Mock for finding existing category
      let selectCallCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([existingCategory]);
          }
          return Promise.resolve([]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Mock for update
      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedCategory]),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      const result = await service.update(slug, updateCategoryDto);

      // Assert
      expect(result).toEqual({
        id: '1',
        name: 'Programming Updated',
        slug: 'programming-new',
        description: 'Updated description',
        postCount: 3,
        createdAt: updatedCategory.createdAt,
        updatedAt: updatedCategory.updatedAt,
      });
    });

    it('존재하지 않는 카테고리 수정 시 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Updated Name',
      };

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.update(slug, updateCategoryDto)).rejects.toThrow(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );
    });

    it('새 이름이 중복될 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'programming';
      const updateCategoryDto: UpdateCategoryDto = {
        name: 'Tech',
      };
      const existingCategory = {
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      let selectCallCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([existingCategory]);
          }
          // Name uniqueness check - return existing
          return Promise.resolve([{ id: 'existing-id' }]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.update(slug, updateCategoryDto)).rejects.toThrow(
        new ConflictException(`카테고리 이름 'Tech'이 이미 존재합니다.`)
      );
    });

    it('새 슬러그가 중복될 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'programming';
      const updateCategoryDto: UpdateCategoryDto = {
        slug: 'tech',
      };
      const existingCategory = {
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: 'Programming tutorials',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      let selectCallCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([existingCategory]);
          }
          // Slug uniqueness check - return existing
          return Promise.resolve([{ id: 'existing-id' }]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.update(slug, updateCategoryDto)).rejects.toThrow(
        new ConflictException(`슬러그 'tech'가 이미 존재합니다.`)
      );
    });

    it('부분 업데이트가 올바르게 동작해야 함', async () => {
      // Arrange
      const slug = 'programming';
      const updateCategoryDto: UpdateCategoryDto = {
        description: 'Updated description only',
        // name과 slug는 없음 - 부분 업데이트
      };
      const existingCategory = {
        id: '1',
        name: 'Programming',
        slug: 'programming',
        description: 'Original description',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedCategory = {
        ...existingCategory,
        description: 'Updated description only',
        updatedAt: new Date('2024-01-02'),
      };

      let selectCallCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([existingCategory]);
          }
          return Promise.resolve([]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedCategory]),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      const result = await service.update(slug, updateCategoryDto);

      // Assert
      expect(result.description).toBe('Updated description only');
      expect(result.name).toBe('Programming'); // 이름은 변경되지 않음
      expect(result.slug).toBe('programming'); // 슬러그는 변경되지 않음
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Updated description only',
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('remove', () => {
    it('포스트가 없는 카테고리를 삭제해야 함', async () => {
      // Arrange
      const slug = 'unused-category';
      const existingCategory = {
        id: '1',
        name: 'Unused Category',
        slug: 'unused-category',
        description: 'No posts here',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Mock for finding category
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingCategory]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockSelectBuilder;
        }
        // Post count check
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 0 }]),
        };
      });

      // Mock for delete
      const mockDeleteBuilder = {
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.delete.mockReturnValue(mockDeleteBuilder);

      // Act
      await service.remove(slug);

      // Assert
      expect(mockDeleteBuilder.where).toHaveBeenCalled();
      expect(database.eq).toHaveBeenCalledWith(database.categories.id, existingCategory.id);
    });

    it('존재하지 않는 카테고리 삭제 시 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.remove(slug)).rejects.toThrow(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );
    });

    it('포스트가 있는 카테고리 삭제 시 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'used-category';
      const existingCategory = {
        id: '1',
        name: 'Used Category',
        slug: 'used-category',
        description: 'Has posts',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingCategory]),
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return mockSelectBuilder;
        }
        // Post count check - has posts
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockResolvedValue([{ count: 5 }]),
        };
      });

      // Act & Assert
      await expect(service.remove(slug)).rejects.toThrow(
        new ConflictException(
          `이 카테고리를 사용하는 포스트가 5개 있어 삭제할 수 없습니다.`
        )
      );
    });
  });

  describe('updatePostCount', () => {
    it('카테고리의 포스트 수를 업데이트해야 함', async () => {
      // Arrange
      const categoryId = '1';
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 10 }]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      await service.updatePostCount(categoryId);

      // Assert
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith({
        postCount: 10,
        updatedAt: expect.any(Date),
      });
      expect(database.eq).toHaveBeenCalledWith(database.categories.id, categoryId);
    });

    it('포스트가 없을 때 0으로 업데이트해야 함', async () => {
      // Arrange
      const categoryId = '1';
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 0 }]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      await service.updatePostCount(categoryId);

      // Assert
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith({
        postCount: 0,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('Edge Cases', () => {
    it('검색어에 공백만 있을 때 무시해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        search: '   ',
      };
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.ilike).not.toHaveBeenCalled();
    });

    it('limit이 최대값을 초과할 때 처리해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        limit: 100, // 최대 허용값
      };
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('검색 조건이 없을 때 having 절을 호출하지 않아야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {};
      const mockCategories = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockCategories),
        having: jest.fn().mockResolvedValue(mockCategories),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.having).not.toHaveBeenCalled();
      expect(mockQueryBuilder.offset).toHaveBeenCalled();
    });

    it('description이 undefined일 때 null로 저장해야 함', async () => {
      // Arrange
      const createCategoryDto: CreateCategoryDto = {
        name: 'Test',
        slug: 'test',
        description: undefined,
      };

      // Mock for uniqueness checks
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Mock for insert
      const mockInsertBuilder = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{
          id: '1',
          name: 'Test',
          slug: 'test',
          description: null,
          postCount: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }]),
      };
      mockDb.insert.mockReturnValue(mockInsertBuilder);

      // Act
      await service.create(createCategoryDto);

      // Assert
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        name: 'Test',
        slug: 'test',
        description: null,
        postCount: 0,
      });
    });
  });
});