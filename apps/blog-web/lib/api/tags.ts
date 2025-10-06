import type { ApiResponse, PaginatedResponse, Tag, TagsQuery } from '@repo/shared';

import { buildQueryParams, ensureAuthToken, request } from './base-client';
import type { ApiRequestOptions } from './base-client';

export const tagsApi = {
  async getTags(
    query: TagsQuery = {},
    options: ApiRequestOptions = {},
  ): Promise<PaginatedResponse<Tag>> {
    const queryString = buildQueryParams(query as Record<string, unknown>);
    const response = await request<Tag[]>(`/api/tags${queryString}`, options);

    return response as PaginatedResponse<Tag>;
  },

  async getTagBySlug(
    slug: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<Tag>> {
    return request<Tag>(`/api/tags/${slug}`, options);
  },

  async createTag(
    payload: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<Tag>> {
    ensureAuthToken(options.token, 'POST /api/tags');
    return request<Tag>('/api/tags', {
      ...options,
      method: 'POST',
      body: payload,
    });
  },

  async updateTag(
    slug: string,
    payload: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<Tag>> {
    ensureAuthToken(options.token, `PUT /api/tags/${slug}`);
    return request<Tag>(`/api/tags/${slug}`, {
      ...options,
      method: 'PUT',
      body: payload,
    });
  },

  async deleteTag(
    slug: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<null>> {
    ensureAuthToken(options.token, `DELETE /api/tags/${slug}`);
    return request<null>(`/api/tags/${slug}`, {
      ...options,
      method: 'DELETE',
    });
  },
};
