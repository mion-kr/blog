import type { CategoriesQuery, Category } from '@repo/shared';

export interface AdminCategoriesData {
  categories: Category[];
  total: number;
  query: CategoriesQuery;
}
