import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagQueryDto } from './dto/tag-query.dto';
import * as database from '@repo/database';

// Mock @repo/database module
jest.mock('@repo/database', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  tags: {},
  postTags: {},
  posts: {},
  eq: jest.fn((a, b) => ({ type: 'eq', a, b })),
  desc: jest.fn((field) => ({ type: 'desc', field })),
  asc: jest.fn((field) => ({ type: 'asc', field })),
  count: jest.fn((field) => ({ type: 'count', field })),
  ilike: jest.fn((field, pattern) => ({ type: 'ilike', field, pattern })),
  and: jest.fn((...conditions) => ({ type: 'and', conditions })),
  or: jest.fn((...conditions) => ({ type: 'or', conditions })),
}));

describe('TagsService', () => {
  let service: TagsService;
  let mockDb: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService],
    }).compile();

    service = module.get<TagsService>(TagsService);
    mockDb = database.db;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('기본 페이징 파라미터로 태그 목록을 반환해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {};
      const mockTags = [
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

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.offset.mockResolvedValue(mockTags);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Next.js',
        slug: 'nextjs',
        postCount: 5,
        createdAt: mockTags[0].createdAt,
        updatedAt: mockTags[0].updatedAt,
      });
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0);
    });

    it('검색어가 있을 때 필터링된 태그를 반환해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'Next',
        page: 1,
        limit: 10,
      };
      const mockTags = [
        {
          id: '1',
          name: 'Next.js',
          slug: 'nextjs',
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
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Next.js');
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%Next%');
      expect(mockQueryBuilder.having).toHaveBeenCalled();
    });

    it('정렬 옵션이 주어졌을 때 올바르게 정렬해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        sort: 'name',
        order: 'asc',
      };
      const mockTags = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockTags),
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.asc).toHaveBeenCalledWith(database.tags.name);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
    });

    it('페이지네이션이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        page: 3,
        limit: 20,
      };
      const mockTags = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(40); // (3-1) * 20
    });
  });

  describe('findOneBySlug', () => {
    it('존재하는 슬러그로 태그를 찾아야 함', async () => {
      // Arrange
      const slug = 'nextjs';
      const mockTag = {
        id: '1',
        name: 'Next.js',
        slug: 'nextjs',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockTag]),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findOneBySlug(slug);

      // Assert
      expect(result).toEqual({
        id: '1',
        name: 'Next.js',
        slug: 'nextjs',
        postCount: 5,
        createdAt: mockTag.createdAt,
        updatedAt: mockTag.updatedAt,
      });
      expect(database.eq).toHaveBeenCalledWith(database.tags.slug, slug);
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
        new NotFoundException(`슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`)
      );
    });
  });

  describe('create', () => {
    it('유효한 데이터로 태그를 생성해야 함', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'TypeScript',
        slug: 'typescript',
      };
      const mockCreatedTag = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
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
        returning: jest.fn().mockResolvedValue([mockCreatedTag]),
      };
      mockDb.insert.mockReturnValue(mockInsertBuilder);

      // Act
      const result = await service.create(createTagDto);

      // Assert
      expect(result).toEqual({
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
        postCount: 0,
        createdAt: mockCreatedTag.createdAt,
        updatedAt: mockCreatedTag.updatedAt,
      });
      expect(mockInsertBuilder.values).toHaveBeenCalledWith({
        name: 'TypeScript',
        slug: 'typescript',
        postCount: 0,
      });
    });

    it('중복된 슬러그일 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'TypeScript',
        slug: 'typescript',
      };

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'existing-id' }]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.create(createTagDto)).rejects.toThrow(
        new ConflictException(`슬러그 'typescript'가 이미 존재합니다.`)
      );
    });

    it('중복된 이름일 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const createTagDto: CreateTagDto = {
        name: 'TypeScript',
        slug: 'typescript',
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
      await expect(service.create(createTagDto)).rejects.toThrow(
        new ConflictException(`태그 이름 'TypeScript'이 이미 존재합니다.`)
      );
    });
  });

  describe('update', () => {
    it('유효한 데이터로 태그를 수정해야 함', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        name: 'TypeScript Updated',
        slug: 'typescript-new',
      };
      const existingTag = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedTag = {
        ...existingTag,
        name: 'TypeScript Updated',
        slug: 'typescript-new',
        updatedAt: new Date('2024-01-02'),
      };

      // Mock for finding existing tag
      let selectCallCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([existingTag]);
          }
          return Promise.resolve([]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Mock for update
      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTag]),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      const result = await service.update(slug, updateTagDto);

      // Assert
      expect(result).toEqual({
        id: '1',
        name: 'TypeScript Updated',
        slug: 'typescript-new',
        postCount: 3,
        createdAt: updatedTag.createdAt,
        updatedAt: updatedTag.updatedAt,
      });
    });

    it('존재하지 않는 태그 수정 시 NotFoundException을 던져야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const updateTagDto: UpdateTagDto = {
        name: 'Updated Name',
      };

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.update(slug, updateTagDto)).rejects.toThrow(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`)
      );
    });

    it('새 이름이 중복될 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        name: 'React',
      };
      const existingTag = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
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
            return Promise.resolve([existingTag]);
          }
          // Name uniqueness check - return existing
          return Promise.resolve([{ id: 'existing-id' }]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.update(slug, updateTagDto)).rejects.toThrow(
        new ConflictException(`태그 이름 'React'이 이미 존재합니다.`)
      );
    });

    it('새 슬러그가 중복될 때 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        slug: 'react',
      };
      const existingTag = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
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
            return Promise.resolve([existingTag]);
          }
          // Slug uniqueness check - return existing
          return Promise.resolve([{ id: 'existing-id' }]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      // Act & Assert
      await expect(service.update(slug, updateTagDto)).rejects.toThrow(
        new ConflictException(`슬러그 'react'가 이미 존재합니다.`)
      );
    });

    it('부분 업데이트가 올바르게 동작해야 함', async () => {
      // Arrange
      const slug = 'typescript';
      const updateTagDto: UpdateTagDto = {
        name: 'TypeScript Updated',
        // slug는 없음 - 부분 업데이트
      };
      const existingTag = {
        id: '1',
        name: 'TypeScript',
        slug: 'typescript',
        postCount: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      const updatedTag = {
        ...existingTag,
        name: 'TypeScript Updated',
        updatedAt: new Date('2024-01-02'),
      };

      let selectCallCount = 0;
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve([existingTag]);
          }
          return Promise.resolve([]);
        }),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedTag]),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      const result = await service.update(slug, updateTagDto);

      // Assert
      expect(result.name).toBe('TypeScript Updated');
      expect(result.slug).toBe('typescript'); // 슬러그는 변경되지 않음
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'TypeScript Updated',
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('remove', () => {
    it('포스트가 없는 태그를 삭제해야 함', async () => {
      // Arrange
      const slug = 'unused-tag';
      const existingTag = {
        id: '1',
        name: 'Unused Tag',
        slug: 'unused-tag',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Mock for finding tag
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingTag]),
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
      expect(database.eq).toHaveBeenCalledWith(database.tags.id, existingTag.id);
    });

    it('존재하지 않는 태그 삭제 시 NotFoundException을 던져야 함', async () => {
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
        new NotFoundException(`슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`)
      );
    });

    it('포스트가 있는 태그 삭제 시 ConflictException을 던져야 함', async () => {
      // Arrange
      const slug = 'used-tag';
      const existingTag = {
        id: '1',
        name: 'Used Tag',
        slug: 'used-tag',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([existingTag]),
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
          `이 태그를 사용하는 포스트가 5개 있어 삭제할 수 없습니다.`
        )
      );
    });
  });

  describe('updatePostCount', () => {
    it('태그의 포스트 수를 업데이트해야 함', async () => {
      // Arrange
      const tagId = '1';
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
      await service.updatePostCount(tagId);

      // Assert
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith({
        postCount: 10,
        updatedAt: expect.any(Date),
      });
      expect(database.eq).toHaveBeenCalledWith(database.tags.id, tagId);
    });
  });

  describe('updateMultiplePostCounts', () => {
    it('여러 태그의 포스트 수를 일괄 업데이트해야 함', async () => {
      // Arrange
      const tagIds = ['1', '2', '3'];
      const mockSelectBuilder = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 5 }]),
      };
      mockDb.select.mockReturnValue(mockSelectBuilder);

      const mockUpdateBuilder = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };
      mockDb.update.mockReturnValue(mockUpdateBuilder);

      // Act
      await service.updateMultiplePostCounts(tagIds);

      // Assert
      expect(mockUpdateBuilder.set).toHaveBeenCalledTimes(3);
    });

    it('빈 배열이 주어졌을 때 아무 작업도 하지 않아야 함', async () => {
      // Arrange
      const tagIds: string[] = [];

      // Act
      await service.updateMultiplePostCounts(tagIds);

      // Assert
      expect(mockDb.select).not.toHaveBeenCalled();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('검색어에 공백만 있을 때 무시해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: '   ',
      };
      const mockTags = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.ilike).not.toHaveBeenCalled();
    });

    it('limit이 최대값을 초과할 때 처리해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        limit: 100, // 최대 허용값
      };
      const mockTags = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('postCount로 정렬할 때 올바르게 동작해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        sort: 'postCount',
        order: 'desc',
      };
      const mockTags = [];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await service.findAll(query);

      // Assert
      expect(database.desc).toHaveBeenCalledWith(database.tags.postCount);
    });
  });

  describe('Search and Autocomplete Features', () => {
    it('부분 문자열 검색이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'Script',
      };
      const mockTags = [
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

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%Script%');
      expect(mockQueryBuilder.having).toHaveBeenCalled();
    });

    it('대소문자 구분 없이 검색해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'REACT',
      };
      const mockTags = [
        {
          id: '1',
          name: 'React',
          slug: 'react',
          postCount: 15,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'React Native',
          slug: 'react-native',
          postCount: 5,
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
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%REACT%');
    });

    it('한글 검색이 올바르게 동작해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: '자바',
      };
      const mockTags = [
        {
          id: '1',
          name: '자바스크립트',
          slug: 'javascript',
          postCount: 10,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: '자바',
          slug: 'java',
          postCount: 7,
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
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%자바%');
    });

    it('특수문자가 포함된 검색어를 처리해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: '.NET',
      };
      const mockTags = [
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

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%.NET%');
    });

    it('짧은 검색어(1글자)도 검색 가능해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'C',
      };
      const mockTags = [
        {
          id: '1',
          name: 'C',
          slug: 'c',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'C++',
          slug: 'cpp',
          postCount: 4,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-04'),
        },
        {
          id: '3',
          name: 'C#',
          slug: 'csharp',
          postCount: 6,
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-06'),
        },
      ];

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(3);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%C%');
    });

    it('검색 결과가 없을 때 빈 배열을 반환해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'NonExistentTag',
      };

      const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        having: jest.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toEqual([]);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%NonExistentTag%');
    });

    it('자동완성을 위한 prefix 검색이 가능해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'Java',
        limit: 5, // 자동완성용 작은 limit
      };
      const mockTags = [
        {
          id: '1',
          name: 'Java',
          slug: 'java',
          postCount: 20,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'JavaScript',
          slug: 'javascript',
          postCount: 15,
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
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(5);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%Java%');
    });

    it('검색 결과를 인기도(postCount)순으로 정렬할 수 있어야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: 'React',
        sort: 'postCount',
        order: 'desc',
      };
      const mockTags = [
        {
          id: '1',
          name: 'React',
          slug: 'react',
          postCount: 20,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          name: 'React Native',
          slug: 'react-native',
          postCount: 5,
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
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result[0].postCount).toBe(20);
      expect(result[1].postCount).toBe(5);
      expect(database.desc).toHaveBeenCalledWith(database.tags.postCount);
    });

    it('검색어의 앞뒤 공백을 제거하고 검색해야 함', async () => {
      // Arrange
      const query: TagQueryDto = {
        search: '  React  ',
      };
      const mockTags = [
        {
          id: '1',
          name: 'React',
          slug: 'react',
          postCount: 15,
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
        having: jest.fn().mockResolvedValue(mockTags),
      };

      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findAll(query);

      // Assert
      expect(result).toHaveLength(1);
      expect(database.ilike).toHaveBeenCalledWith(database.tags.name, '%React%');
    });
  });
});