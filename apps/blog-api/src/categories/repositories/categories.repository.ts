import { CategoryEntity } from '../domain/category.model';

export type CategorySortField =
  | 'createdAt'
  | 'updatedAt'
  | 'name'
  | 'postCount';
export type SortDirection = 'asc' | 'desc';

export interface FindCategoriesOptions {
  page: number;
  limit: number;
  sort: CategorySortField;
  order: SortDirection;
  search?: string;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string | null;
}

export interface UpdateCategoryData {
  name?: string;
  slug?: string;
  description?: string | null;
}

export interface CategoriesRepository {
  findMany(options: FindCategoriesOptions): Promise<CategoryEntity[]>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  findById(id: string): Promise<CategoryEntity | null>;
  create(data: CreateCategoryData): Promise<CategoryEntity>;
  update(id: string, data: UpdateCategoryData): Promise<CategoryEntity>;
  delete(id: string): Promise<void>;
  existsBySlug(slug: string, excludeId?: string): Promise<boolean>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  updatePostCount(categoryId: string): Promise<void>;
  countPosts(categoryId: string): Promise<number>;
}

export const CATEGORIES_REPOSITORY = Symbol('CATEGORIES_REPOSITORY');
