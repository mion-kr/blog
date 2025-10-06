import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { mapToCategoryResponse } from './application/category-response.mapper';
import {
  CATEGORIES_REPOSITORY,
  CategoriesRepository,
  CategorySortField,
  SortDirection as CategorySortDirection,
} from './repositories/categories.repository';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const DEFAULT_SORT: CategoryQueryDto['sort'] = 'createdAt';
const DEFAULT_ORDER: CategoryQueryDto['order'] = 'desc';

/**
 * 카테고리 관련 비즈니스 로직을 처리하는 서비스
 */
@Injectable()
export class CategoriesService {
  constructor(
    @Inject(CATEGORIES_REPOSITORY)
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async findAll(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    const {
      page = DEFAULT_PAGE,
      limit = DEFAULT_LIMIT,
      sort,
      order,
      search,
    } = query;

    const sortField: CategorySortField = (sort ??
      DEFAULT_SORT) as CategorySortField;
    const orderDirection: CategorySortDirection = (order ??
      DEFAULT_ORDER) as CategorySortDirection;

    const categories = await this.categoriesRepository.findMany({
      page,
      limit,
      sort: sortField,
      order: orderDirection,
      search,
    });

    return categories.map(mapToCategoryResponse);
  }

  async findAllOld(query: CategoryQueryDto): Promise<CategoryResponseDto[]> {
    return this.findAll(query);
  }

  async findOneBySlug(slug: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesRepository.findBySlug(slug);

    if (!category) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`,
      );
    }

    return mapToCategoryResponse(category);
  }

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const { name, slug, description } = createCategoryDto;

    await this.ensureSlugUnique(slug);
    await this.ensureNameUnique(name);

    const category = await this.categoriesRepository.create({
      name,
      slug,
      description: description ?? null,
    });

    return mapToCategoryResponse(category);
  }

  async update(
    slug: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.categoriesRepository.findBySlug(slug);
    if (!existingCategory) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`,
      );
    }

    const { name, slug: newSlug, description } = updateCategoryDto;

    if (name && name !== existingCategory.name) {
      await this.ensureNameUnique(name, existingCategory.id);
    }

    if (newSlug && newSlug !== existingCategory.slug) {
      await this.ensureSlugUnique(newSlug, existingCategory.id);
    }

    const updatedCategory = await this.categoriesRepository.update(
      existingCategory.id,
      {
        name,
        slug: newSlug,
        description,
      },
    );

    return mapToCategoryResponse(updatedCategory);
  }

  async remove(slug: string): Promise<void> {
    const existingCategory = await this.categoriesRepository.findBySlug(slug);
    if (!existingCategory) {
      throw new NotFoundException(
        `슬러그 '${slug}'에 해당하는 카테고리를 찾을 수 없습니다.`,
      );
    }

    const postCount = await this.categoriesRepository.countPosts(
      existingCategory.id,
    );

    if (postCount > 0) {
      throw new ConflictException(
        `이 카테고리를 사용하는 포스트가 ${postCount}개 있어 삭제할 수 없습니다.`,
      );
    }

    await this.categoriesRepository.delete(existingCategory.id);
  }

  async updatePostCount(categoryId: string): Promise<void> {
    await this.categoriesRepository.updatePostCount(categoryId);
  }

  private async ensureSlugUnique(
    slug: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.categoriesRepository.existsBySlug(
      slug,
      excludeId,
    );
    if (exists) {
      throw new ConflictException(`슬러그 '${slug}'가 이미 존재합니다.`);
    }
  }

  private async ensureNameUnique(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const exists = await this.categoriesRepository.existsByName(
      name,
      excludeId,
    );
    if (exists) {
      throw new ConflictException(`카테고리 이름 '${name}'이 이미 존재합니다.`);
    }
  }
}
