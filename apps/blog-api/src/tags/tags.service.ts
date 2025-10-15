import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PaginatedData, PaginationMeta } from '@repo/shared';

import { CreateTagDto } from './dto/create-tag.dto';
import { TagQueryDto } from './dto/tag-query.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { mapToTagResponse } from './application/tag-response.mapper';
import {
  TAGS_REPOSITORY,
  TagSortField,
  TagsRepository,
  SortDirection as TagSortDirection,
} from './repositories/tags.repository';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: TagQueryDto['sort'] = 'createdAt';
const DEFAULT_ORDER: TagQueryDto['order'] = 'desc';

/**
 * 태그 관련 비즈니스 로직을 처리하는 서비스
 */
@Injectable()
export class TagsService {
  constructor(
    @Inject(TAGS_REPOSITORY)
    private readonly tagsRepository: TagsRepository,
  ) {}

  async findAll(query: TagQueryDto): Promise<PaginatedData<TagResponseDto>> {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
      sort,
      order,
      search,
    } = query;

    const sortField: TagSortField = (sort ?? DEFAULT_SORT) as TagSortField;
    const orderDirection: TagSortDirection = (order ??
      DEFAULT_ORDER) as TagSortDirection;

    const { items, total } = await this.tagsRepository.findMany({
      page,
      limit,
      sort: sortField,
      order: orderDirection,
      search,
    });

    return {
      items: items.map(mapToTagResponse),
      meta: PaginationMeta.create(total, page, limit),
    };
  }

  async findAllOld(query: TagQueryDto): Promise<TagResponseDto[]> {
    const result = await this.findAll(query);
    return result.items;
  }

  async findOneBySlug(slug: string): Promise<TagResponseDto> {
    const tag = await this.tagsRepository.findBySlug(slug);

    if (!tag) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
      );
    }

    return mapToTagResponse(tag);
  }

  async create(createTagDto: CreateTagDto): Promise<TagResponseDto> {
    const { name, slug } = createTagDto;

    await this.ensureSlugUnique(slug);
    await this.ensureNameUnique(name);

    const tag = await this.tagsRepository.create({
      name,
      slug,
    });

    return mapToTagResponse(tag);
  }

  async update(
    slug: string,
    updateTagDto: UpdateTagDto,
  ): Promise<TagResponseDto> {
    const existingTag = await this.tagsRepository.findBySlug(slug);
    if (!existingTag) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
      );
    }

    const { name, slug: newSlug } = updateTagDto;

    if (name && name !== existingTag.name) {
      await this.ensureNameUnique(name, existingTag.id);
    }

    if (newSlug && newSlug !== existingTag.slug) {
      await this.ensureSlugUnique(newSlug, existingTag.id);
    }

    const updatedTag = await this.tagsRepository.update(existingTag.id, {
      name,
      slug: newSlug,
    });

    return mapToTagResponse(updatedTag);
  }

  async remove(slug: string): Promise<void> {
    const existingTag = await this.tagsRepository.findBySlug(slug);
    if (!existingTag) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 태그를 찾을 수 없습니다.`,
      );
    }

    const postCount = await this.tagsRepository.countPosts(existingTag.id);
    if (postCount > 0) {
      throw new ConflictException(
        `이 태그를 사용하는 포스트가 ${postCount}개 있어 삭제할 수 없습니다.`,
      );
    }

    await this.tagsRepository.delete(existingTag.id);
  }

  async updatePostCount(tagId: string): Promise<void> {
    await this.tagsRepository.updatePostCount(tagId);
  }

  async updateMultiplePostCounts(tagIds: string[]): Promise<void> {
    await this.tagsRepository.updateMultiplePostCounts(tagIds);
  }

  private async ensureSlugUnique(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.tagsRepository.existsBySlug(slug, excludeId);
    if (exists) {
      throw new ConflictException(`슬러그 '${slug}'가 이미 존재합니다.`);
    }
  }

  private async ensureNameUnique(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.tagsRepository.existsByName(name, excludeId);
    if (exists) {
      throw new ConflictException(`태그 이름 '${name}'이 이미 존재합니다.`);
    }
  }
}
