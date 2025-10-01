import type {
  ApiResponse,
  CategoriesQuery,
  Category,
  PaginatedResponse,
} from '@repo/shared';

import { buildQueryParams, ensureAuthToken, request } from './base-client';
import type { ApiRequestOptions } from './base-client';

export const categoriesApi = {
  async getCategories(
    query: CategoriesQuery = {},
    options: ApiRequestOptions = {},
  ): Promise<PaginatedResponse<Category>> {
    const queryString = buildQueryParams(query as Record<string, unknown>);
    const response = await request<Category[]>(
      `/api/categories${queryString}`,
      options,
    );

    return response as PaginatedResponse<Category>;
  },

  async getCategoryBySlug(
    slug: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<Category>> {
    return request<Category>(`/api/categories/${slug}`, options);
  },

  async createCategory(
    payload: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<Category>> {
    ensureAuthToken(options.token, 'POST /api/categories');
    return request<Category>('/api/categories', {
      ...options,
      method: 'POST',
      body: payload,
    });
  },

  async updateCategory(
    slug: string,
    payload: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<Category>> {
    ensureAuthToken(options.token, `PUT /api/categories/${slug}`);
    return request<Category>(`/api/categories/${slug}`, {
      ...options,
      method: 'PUT',
      body: payload,
    });
  },

  async deleteCategory(
    slug: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<null>> {
    ensureAuthToken(options.token, `DELETE /api/categories/${slug}`);
    return request<null>(`/api/categories/${slug}`, {
      ...options,
      method: 'DELETE',
    });
  },
};
