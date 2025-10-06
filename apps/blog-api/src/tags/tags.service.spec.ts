import { ConflictException, NotFoundException } from '@nestjs/common'
import { TagsService } from './tags.service'
import type {
  TagsRepository,
  TagSortField,
  SortDirection as TagSortDirection,
} from './repositories/tags.repository'
import type { TagEntity } from './domain/tag.model'
import { CreateTagDto } from './dto/create-tag.dto'
import { UpdateTagDto } from './dto/update-tag.dto'
import { TagQueryDto } from './dto/tag-query.dto'

describe('TagsService', () => {
  let service: TagsService
  let repository: jest.Mocked<TagsRepository>

  const createTagEntity = (overrides: Partial<TagEntity> = {}): TagEntity => ({
    id: overrides.id ?? 'tag-1',
    name: overrides.name ?? 'Next.js',
    slug: overrides.slug ?? 'nextjs',
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
      updateMultiplePostCounts: jest.fn(),
      countPosts: jest.fn(),
    }

    service = new TagsService(repository)
  })

  describe('findAll', () => {
    it('기본 옵션으로 태그 목록을 반환해야 함', async () => {
      const tags = [createTagEntity(), createTagEntity({ id: 'tag-2', name: 'React', slug: 'react' })]
      repository.findMany.mockResolvedValue(tags)

      const result = await service.findAll({})

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        sort: 'createdAt' satisfies TagSortField,
        order: 'desc' satisfies TagSortDirection,
        search: undefined,
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 'tag-1', name: 'Next.js', slug: 'nextjs' })
    })

    it('검색 및 정렬 옵션을 전달해야 함', async () => {
      repository.findMany.mockResolvedValue([])
      const query: TagQueryDto = {
        page: 3,
        limit: 5,
        sort: 'name',
        order: 'asc',
        search: 'Next',
      }

      await service.findAll(query)

      expect(repository.findMany).toHaveBeenCalledWith({
        page: 3,
        limit: 5,
        sort: 'name',
        order: 'asc',
        search: 'Next',
      })
    })
  })

  describe('findOneBySlug', () => {
    it('존재하는 슬러그를 조회해야 함', async () => {
      const entity = createTagEntity()
      repository.findBySlug.mockResolvedValue(entity)

      const result = await service.findOneBySlug('nextjs')

      expect(repository.findBySlug).toHaveBeenCalledWith('nextjs')
      expect(result).toMatchObject({ id: 'tag-1', name: 'Next.js' })
    })

    it('존재하지 않는 슬러그는 NotFoundException', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.findOneBySlug('unknown')).rejects.toThrow(
        new NotFoundException(`슬러그 'unknown'에 해당하는 태그를 찾을 수 없습니다.`),
      )
    })
  })

  describe('create', () => {
    it('중복 검사 후 태그를 생성해야 함', async () => {
      const dto: CreateTagDto = { name: 'TypeScript', slug: 'typescript' }
      const created = createTagEntity({ id: 'tag-ts', name: 'TypeScript', slug: 'typescript' })

      repository.existsBySlug.mockResolvedValue(false)
      repository.existsByName.mockResolvedValue(false)
      repository.create.mockResolvedValue(created)

      const result = await service.create(dto)

      expect(repository.existsBySlug).toHaveBeenCalledWith('typescript', undefined)
      expect(repository.existsByName).toHaveBeenCalledWith('TypeScript', undefined)
      expect(repository.create).toHaveBeenCalledWith({ name: 'TypeScript', slug: 'typescript' })
      expect(result).toMatchObject({ id: 'tag-ts', name: 'TypeScript', slug: 'typescript' })
    })

    it('중복 슬러그가 있으면 ConflictException', async () => {
      repository.existsBySlug.mockResolvedValue(true)
      const dto: CreateTagDto = { name: 'TypeScript', slug: 'typescript' }

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(`슬러그 'typescript'가 이미 존재합니다.`),
      )
      expect(repository.existsByName).not.toHaveBeenCalled()
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('중복 이름이 있으면 ConflictException', async () => {
      repository.existsBySlug.mockResolvedValue(false)
      repository.existsByName.mockResolvedValue(true)
      const dto: CreateTagDto = { name: 'TypeScript', slug: 'typescript' }

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException(`태그 이름 'TypeScript'이 이미 존재합니다.`),
      )
      expect(repository.create).not.toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('기존 태그를 수정해야 함', async () => {
      const existing = createTagEntity()
      const updated = createTagEntity({ name: 'Updated', slug: 'updated' })
      repository.findBySlug.mockResolvedValue(existing)
      repository.existsByName.mockResolvedValue(false)
      repository.existsBySlug.mockResolvedValue(false)
      repository.update.mockResolvedValue(updated)

      const dto: UpdateTagDto = { name: 'Updated', slug: 'updated' }
      const result = await service.update('nextjs', dto)

      expect(repository.findBySlug).toHaveBeenCalledWith('nextjs')
      expect(repository.existsByName).toHaveBeenCalledWith('Updated', existing.id)
      expect(repository.existsBySlug).toHaveBeenCalledWith('updated', existing.id)
      expect(repository.update).toHaveBeenCalledWith(existing.id, {
        name: 'Updated',
        slug: 'updated',
      })
      expect(result).toMatchObject({ name: 'Updated', slug: 'updated' })
    })

    it('존재하지 않는 태그는 NotFoundException', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.update('missing', {})).rejects.toThrow(
        new NotFoundException(`슬러그 'missing'에 해당하는 태그를 찾을 수 없습니다.`),
      )
    })
  })

  describe('remove', () => {
    it('포스트가 연결되지 않은 태그를 삭제해야 함', async () => {
      const entity = createTagEntity({ id: 'tag-1' })
      repository.findBySlug.mockResolvedValue(entity)
      repository.countPosts.mockResolvedValue(0)

      await service.remove('nextjs')

      expect(repository.delete).toHaveBeenCalledWith('tag-1')
    })

    it('포스트가 연결되어 있으면 ConflictException', async () => {
      const entity = createTagEntity({ id: 'tag-1' })
      repository.findBySlug.mockResolvedValue(entity)
      repository.countPosts.mockResolvedValue(2)

      await expect(service.remove('nextjs')).rejects.toThrow(
        new ConflictException(`이 태그를 사용하는 포스트가 2개 있어 삭제할 수 없습니다.`),
      )
      expect(repository.delete).not.toHaveBeenCalled()
    })
  })

  it('updatePostCount는 repository 호출을 위임해야 함', async () => {
    await service.updatePostCount('tag-1')
    expect(repository.updatePostCount).toHaveBeenCalledWith('tag-1')
  })

  it('updateMultiplePostCounts는 repository 호출을 위임해야 함', async () => {
    await service.updateMultiplePostCounts(['tag-1', 'tag-2'])
    expect(repository.updateMultiplePostCounts).toHaveBeenCalledWith(['tag-1', 'tag-2'])
  })
})
