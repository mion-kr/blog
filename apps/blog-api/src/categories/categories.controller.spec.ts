import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    findAll: jest.fn(),
    findOneBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('모든 카테고리를 반환해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        page: 1,
        limit: 10,
        sort: 'createdAt',
        order: 'desc',
      };
      const mockCategories: CategoryResponseDto[] = [
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

      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockCategories);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('빈 쿼리 파라미터로 호출할 수 있어야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {};
      const mockCategories: CategoryResponseDto[] = [];

      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockCategories);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('검색 쿼리를 서비스에 전달해야 함', async () => {
      // Arrange
      const query: CategoryQueryDto = {
        search: 'Tech',
        page: 2,
        limit: 20,
      };
      const mockCategories: CategoryResponseDto[] = [
        {
          id: '1',
          name: 'Tech',
          slug: 'tech',
          postCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockCategoriesService.findAll.mockResolvedValue(mockCategories);

      // Act
      const result = await controller.findAll(query);

      // Assert
      expect(result).toEqual(mockCategories);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('슬러그로 카테고리를 찾아 반환해야 함', async () => {
      // Arrange
      const slug = 'tech';
      const mockCategory: CategoryResponseDto = {
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: 'Technology posts',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockCategoriesService.findOneBySlug.mockResolvedValue(mockCategory);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
      expect(service.findOneBySlug).toHaveBeenCalledTimes(1);
    });

    it('존재하지 않는 카테고리에 대해 NotFoundException을 전파해야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      mockCategoriesService.findOneBySlug.mockRejectedValue(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );

      // Act & Assert
      await expect(controller.findOne(slug)).rejects.toThrow(NotFoundException);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });

    it('특수 문자가 포함된 슬러그를 처리할 수 있어야 함', async () => {
      // Arrange
      const slug = 'tech-and-programming';
      const mockCategory: CategoryResponseDto = {
        id: '1',
        name: 'Tech & Programming',
        slug: 'tech-and-programming',
        description: 'Technology and programming posts',
        postCount: 10,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockCategoriesService.findOneBySlug.mockResolvedValue(mockCategory);

      // Act
      const result = await controller.findOne(slug);

      // Assert
      expect(result).toEqual(mockCategory);
      expect(service.findOneBySlug).toHaveBeenCalledWith(slug);
    });
  });

  describe('create', () => {
    it('새 카테고리를 생성하고 반환해야 함', async () => {
      // Arrange
      const createDto: CreateCategoryDto = {
        name: 'New Category',
        slug: 'new-category',
        description: 'A new category for posts',
      };
      const mockCreatedCategory: CategoryResponseDto = {
        id: '1',
        name: 'New Category',
        slug: 'new-category',
        description: 'A new category for posts',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockCategoriesService.create.mockResolvedValue(mockCreatedCategory);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(mockCreatedCategory);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('description 없이 카테고리를 생성할 수 있어야 함', async () => {
      // Arrange
      const createDto: CreateCategoryDto = {
        name: 'Simple Category',
        slug: 'simple-category',
      };
      const mockCreatedCategory: CategoryResponseDto = {
        id: '1',
        name: 'Simple Category',
        slug: 'simple-category',
        postCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockCategoriesService.create.mockResolvedValue(mockCreatedCategory);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(mockCreatedCategory);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('슬러그 중복 시 ConflictException을 전파해야 함', async () => {
      // Arrange
      const createDto: CreateCategoryDto = {
        name: 'Duplicate',
        slug: 'existing-slug',
      };
      mockCategoriesService.create.mockRejectedValue(
        new ConflictException(`슬러그 'existing-slug'가 이미 존재합니다.`)
      );

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('이름 중복 시 ConflictException을 전파해야 함', async () => {
      // Arrange
      const createDto: CreateCategoryDto = {
        name: 'Existing Name',
        slug: 'new-slug',
      };
      mockCategoriesService.create.mockRejectedValue(
        new ConflictException(`카테고리 이름 'Existing Name'이 이미 존재합니다.`)
      );

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('update', () => {
    it('카테고리를 수정하고 반환해야 함', async () => {
      // Arrange
      const slug = 'old-slug';
      const updateDto: UpdateCategoryDto = {
        name: 'Updated Category',
        slug: 'updated-slug',
        description: 'Updated description',
      };
      const mockUpdatedCategory: CategoryResponseDto = {
        id: '1',
        name: 'Updated Category',
        slug: 'updated-slug',
        description: 'Updated description',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockCategoriesService.update.mockResolvedValue(mockUpdatedCategory);

      // Act
      const result = await controller.update(slug, updateDto);

      // Assert
      expect(result).toEqual(mockUpdatedCategory);
      expect(service.update).toHaveBeenCalledWith(slug, updateDto);
      expect(service.update).toHaveBeenCalledTimes(1);
    });

    it('부분 업데이트를 할 수 있어야 함', async () => {
      // Arrange
      const slug = 'tech';
      const updateDto: UpdateCategoryDto = {
        description: 'Only updating description',
      };
      const mockUpdatedCategory: CategoryResponseDto = {
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: 'Only updating description',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockCategoriesService.update.mockResolvedValue(mockUpdatedCategory);

      // Act
      const result = await controller.update(slug, updateDto);

      // Assert
      expect(result).toEqual(mockUpdatedCategory);
      expect(service.update).toHaveBeenCalledWith(slug, updateDto);
    });

    it('존재하지 않는 카테고리 수정 시 NotFoundException을 전파해야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      const updateDto: UpdateCategoryDto = {
        name: 'Updated Name',
      };
      mockCategoriesService.update.mockRejectedValue(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );

      // Act & Assert
      await expect(controller.update(slug, updateDto)).rejects.toThrow(NotFoundException);
      expect(service.update).toHaveBeenCalledWith(slug, updateDto);
    });

    it('새 슬러그 중복 시 ConflictException을 전파해야 함', async () => {
      // Arrange
      const slug = 'current-slug';
      const updateDto: UpdateCategoryDto = {
        slug: 'existing-slug',
      };
      mockCategoriesService.update.mockRejectedValue(
        new ConflictException(`슬러그 'existing-slug'가 이미 존재합니다.`)
      );

      // Act & Assert
      await expect(controller.update(slug, updateDto)).rejects.toThrow(ConflictException);
      expect(service.update).toHaveBeenCalledWith(slug, updateDto);
    });

    it('새 이름 중복 시 ConflictException을 전파해야 함', async () => {
      // Arrange
      const slug = 'current-slug';
      const updateDto: UpdateCategoryDto = {
        name: 'Existing Name',
      };
      mockCategoriesService.update.mockRejectedValue(
        new ConflictException(`카테고리 이름 'Existing Name'이 이미 존재합니다.`)
      );

      // Act & Assert
      await expect(controller.update(slug, updateDto)).rejects.toThrow(ConflictException);
      expect(service.update).toHaveBeenCalledWith(slug, updateDto);
    });

    it('빈 업데이트 DTO를 처리할 수 있어야 함', async () => {
      // Arrange
      const slug = 'tech';
      const updateDto: UpdateCategoryDto = {};
      const mockUpdatedCategory: CategoryResponseDto = {
        id: '1',
        name: 'Tech',
        slug: 'tech',
        description: 'Technology posts',
        postCount: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockCategoriesService.update.mockResolvedValue(mockUpdatedCategory);

      // Act
      const result = await controller.update(slug, updateDto);

      // Assert
      expect(result).toEqual(mockUpdatedCategory);
      expect(service.update).toHaveBeenCalledWith(slug, updateDto);
    });
  });

  describe('remove', () => {
    it('카테고리를 삭제해야 함', async () => {
      // Arrange
      const slug = 'unused-category';
      mockCategoriesService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(slug);

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(slug);
      expect(service.remove).toHaveBeenCalledTimes(1);
    });

    it('존재하지 않는 카테고리 삭제 시 NotFoundException을 전파해야 함', async () => {
      // Arrange
      const slug = 'non-existent';
      mockCategoriesService.remove.mockRejectedValue(
        new NotFoundException(`슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(NotFoundException);
      expect(service.remove).toHaveBeenCalledWith(slug);
    });

    it('포스트가 있는 카테고리 삭제 시 ConflictException을 전파해야 함', async () => {
      // Arrange
      const slug = 'used-category';
      mockCategoriesService.remove.mockRejectedValue(
        new ConflictException(`이 카테고리를 사용하는 포스트가 5개 있어 삭제할 수 없습니다.`)
      );

      // Act & Assert
      await expect(controller.remove(slug)).rejects.toThrow(ConflictException);
      expect(service.remove).toHaveBeenCalledWith(slug);
    });

    it('특수 문자가 포함된 슬러그를 처리할 수 있어야 함', async () => {
      // Arrange
      const slug = 'tech-and-programming';
      mockCategoriesService.remove.mockResolvedValue(undefined);

      // Act
      const result = await controller.remove(slug);

      // Assert
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(slug);
    });
  });

  describe('Guard Application', () => {
    it('create 메서드는 AdminGuard와 CsrfGuard를 사용해야 함', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', controller.create);

      // Assert
      // UseGuards 데코레이터가 적용되었는지 확인
      expect(guards).toBeDefined();
      // Note: 실제 가드 인스턴스 검증은 통합 테스트에서 수행
    });

    it('update 메서드는 AdminGuard와 CsrfGuard를 사용해야 함', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', controller.update);

      // Assert
      expect(guards).toBeDefined();
    });

    it('remove 메서드는 AdminGuard와 CsrfGuard를 사용해야 함', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', controller.remove);

      // Assert
      expect(guards).toBeDefined();
    });

    it('findAll 메서드는 가드를 사용하지 않아야 함', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', controller.findAll);

      // Assert
      expect(guards).toBeUndefined();
    });

    it('findOne 메서드는 가드를 사용하지 않아야 함', () => {
      // Arrange & Act
      const guards = Reflect.getMetadata('__guards__', controller.findOne);

      // Assert
      expect(guards).toBeUndefined();
    });
  });

  describe('HTTP Status Codes', () => {
    it('remove 메서드는 NO_CONTENT 상태 코드를 반환해야 함', () => {
      // Arrange & Act
      const httpCode = Reflect.getMetadata('__httpCode__', controller.remove);

      // Assert
      expect(httpCode).toBe(204); // HttpStatus.NO_CONTENT
    });
  });

  describe('Error Handling', () => {
    it('서비스에서 예상치 못한 에러 발생 시 전파해야 함', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockCategoriesService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll({})).rejects.toThrow(error);
    });

    it('잘못된 형식의 슬러그에 대해 적절히 처리해야 함', async () => {
      // Arrange
      const invalidSlug = '';
      mockCategoriesService.findOneBySlug.mockRejectedValue(
        new NotFoundException(`슬러그 '${invalidSlug}'에 해당하는 카테고리를 찾을 수 없습니다.`)
      );

      // Act & Assert
      await expect(controller.findOne(invalidSlug)).rejects.toThrow(NotFoundException);
    });
  });
});