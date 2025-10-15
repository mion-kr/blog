import { ConflictException, NotFoundException } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import type {
  CategoriesRepository,
  CategorySortField,
  SortDirection,
} from './repositories/categories.repository'
import type { CategoryEntity } from './domain/category.model'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CategoryQueryDto } from './dto/category-query.dto'

describe('CategoriesService', () => {
  let service: CategoriesService
  let repository: jest.Mocked<CategoriesRepository>

  const createCategory = (overrides: Partial<CategoryEntity> = {}): CategoryEntity => ({
    id: overrides.id ?? 'cat-1',
    name: overrides.name ?? '개발',
    slug: overrides.slug ?? 'development',
    description: overrides.description ?? '설명',
    postCount: overrides.postCount ?? 0,
    createdAt: overrides.createdAt ?? new Date('2024-01-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2024-01-02T00:00:00Z'),
  })

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsBySlug: jest.fn(),
      existsByName: jest.fn(),
      updatePostCount: jest.fn(),
      countPosts: jest.fn(),
    }

    service = new CategoriesService(repository)
  })

  describe('findAll', () => {
    it('기본 옵션으로 카테고리를 반환해야 함', async () => {
      const categories = [createCategory(), createCategory({ id: 'cat-2', name: '회고', slug: 'retro' })]
      repository.findMany.mockResolvedValue({ items: categories, total: 2 })

      const result = await service.findAll({})

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sort: 'createdAt' satisfies CategorySortField,
        order: 'desc' satisfies SortDirection,
        search: undefined,
      })
      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toMatchObject({ id: 'cat-1', name: '개발', slug: 'development' })
      expect(result.meta.total).toBe(2)
    })

    it('검색어와 정렬을 전달해야 함', async () => {
      repository.findMany.mockResolvedValue({ items: [], total: 0 })

      const query: CategoryQueryDto = {
        page: 2,
        limit: 5,
        sort: 'name',
        order: 'asc',
        search: 'dev',
      }

      await service.findAll(query)

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        sort: 'name',
        order: 'asc',
        search: 'dev',
      })
    })
  })

  describe('findOneBySlug', () => {
    it('존재하는 카테고리를 반환해야 함', async () => {
      const entity = createCategory()
      repository.findBySlug.mockResolvedValue(entity)

      const result = await service.findOneBySlug('development')

      expect(repository.findBySlug).toHaveBeenCalledWith('development')
      expect(result).toMatchObject({ id: 'cat-1', name: '개발' })
    })

    it('없으면 NotFoundException', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.findOneBySlug('missing')).rejects.toThrow(
        new NotFoundException(`슬러그 'missing'에 해당하는 카테고리를 찾을 수 없습니다.`),
      )
    })
  })

  describe('create', () => {
    it('중복 검사 후 카테고리를 생성해야 함', async () => {
      const dto: CreateCategoryDto = {
        name: '프론트엔드',
        slug: 'frontend',
        description: '설명',
      }
      const entity = createCategory({ id: 'cat-frontend', name: '프론트엔드', slug: 'frontend', description: '설명' })

      repository.existsBySlug.mockResolvedValue(false)
      repository.existsByName.mockResolvedValue(false)
      repository.create.mockResolvedValue(entity)

      const result = await service.create(dto)

      expect(repository.existsBySlug).toHaveBeenCalledWith('frontend', undefined)
      expect(repository.existsByName).toHaveBeenCalledWith('프론트엔드', undefined)
      expect(repository.create).toHaveBeenCalledWith({
        name: '프론트엔드',
        slug: 'frontend',
        description: '설명',
      })
      expect(result).toMatchObject({ id: 'cat-frontend', name: '프론트엔드', slug: 'frontend', description: '설명' })
    })

    it('슬러그가 중복이면 ConflictException', async () => {
      repository.existsBySlug.mockResolvedValue(true)
      const dto: CreateCategoryDto = { name: '프론트엔드', slug: 'frontend' }

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(`슬러그 'frontend'가 이미 존재합니다.`),
      )
      expect(repository.existsByName).not.toHaveBeenCalled()
    })

    it('이름이 중복이면 ConflictException', async () => {
      repository.existsBySlug.mockResolvedValue(false)
      repository.existsByName.mockResolvedValue(true)

      await expect(service.create({ name: '프론트엔드', slug: 'frontend' })).rejects.toThrow(
        new ConflictException(`카테고리 이름 '프론트엔드'이 이미 존재합니다.`),
      )
      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('기존 카테고리를 수정해야 함', async () => {
      const existing = createCategory()
      const updated = createCategory({ name: '업데이트', slug: 'updated', description: '새 설명' })
      repository.findBySlug.mockResolvedValue(existing)
      repository.existsByName.mockResolvedValue(false)
      repository.existsBySlug.mockResolvedValue(false)
      repository.update.mockResolvedValue(updated)

      const dto: UpdateCategoryDto = { name: '업데이트', slug: 'updated', description: '새 설명' }
      const result = await service.update('development', dto)

      expect(repository.update).toHaveBeenCalledWith(existing.id, {
        name: '업데이트',
        slug: 'updated',
        description: '새 설명',
      })
      expect(result).toMatchObject({ name: '업데이트', slug: 'updated', description: '새 설명' })
    })

    it('존재하지 않으면 NotFoundException', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.update('missing', {})).rejects.toThrow(
        new NotFoundException(`슬러그 'missing'에 해당하는 카테고리를 찾을 수 없습니다.`),
      )
    })
  })

  describe('remove', () => {
    it('포스트가 없으면 삭제해야 함', async () => {
      const entity = createCategory({ id: 'cat-1' })
      repository.findBySlug.mockResolvedValue(entity)
      repository.countPosts.mockResolvedValue(0)

      await service.remove('development')

      expect(repository.delete).toHaveBeenCalledWith('cat-1')
    })

    it('포스트가 있으면 ConflictException', async () => {
      const entity = createCategory({ id: 'cat-1' })
      repository.findBySlug.mockResolvedValue(entity)
      repository.countPosts.mockResolvedValue(3)

      await expect(service.remove('development')).rejects.toThrow(
        new ConflictException('이 카테고리를 사용하는 포스트가 3개 있어 삭제할 수 없습니다.'),
      )
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })

  it('updatePostCount는 repository delegation', async () => {
    await service.updatePostCount('cat-1')
    expect(repository.updatePostCount).toHaveBeenCalledWith('cat-1')
  })
})
