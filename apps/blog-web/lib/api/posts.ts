import type {
  ApiResponse,
  PaginatedResponse,
  PostResponseDto,
  PostsQuery,
} from '@repo/shared';

import { buildQueryParams, ensureAuthToken, request } from './base-client';
import type { ApiRequestOptions } from './base-client';

export const postsApi = {
  async getPosts(
    query: PostsQuery = {},
    options: ApiRequestOptions = {},
  ): Promise<PaginatedResponse<PostResponseDto>> {
    const queryString = buildQueryParams(query as Record<string, unknown>);
    const response = await request<PostResponseDto[]>(
      `/api/posts${queryString}`,
      options,
    );

    return response as PaginatedResponse<PostResponseDto>;
  },

  async getPostBySlug(
    slug: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<PostResponseDto>> {
    return request<PostResponseDto>(`/api/posts/${slug}`, options);
  },

  async getPostById(
    id: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<PostResponseDto>> {
    return request<PostResponseDto>(`/api/posts/id/${id}`, options);
  },

  async createPost(
    payload: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<PostResponseDto>> {
    ensureAuthToken(options.token, 'POST /api/posts');
    return request<PostResponseDto>('/api/posts', {
      ...options,
      method: 'POST',
      body: payload,
    });
  },

  async updatePost(
    slug: string,
    payload: unknown,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<PostResponseDto>> {
    ensureAuthToken(options.token, `PUT /api/posts/${slug}`);
    return request<PostResponseDto>(`/api/posts/${slug}`, {
      ...options,
      method: 'PUT',
      body: payload,
    });
  },

  async deletePost(
    slug: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<null>> {
    ensureAuthToken(options.token, `DELETE /api/posts/${slug}`);
    return request<null>(`/api/posts/${slug}`, {
      ...options,
      method: 'DELETE',
    });
  },
};
