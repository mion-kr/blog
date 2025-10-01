import { CategoryEntity } from '../domain/category.model';
import { CategoryResponseDto } from '../dto/category-response.dto';

export function mapToCategoryResponse(
  category: CategoryEntity,
): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? undefined,
    postCount: category.postCount,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  } as CategoryResponseDto;
}
