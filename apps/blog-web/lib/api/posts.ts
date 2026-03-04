import type {
  ApiResponse,
  PaginatedResponse,
  PostResponseDto,
  PostsQuery,
} from '@repo/shared';

import { buildQueryParams, ensureAuthToken, request } from './base-client';
import type { ApiRequestOptions } from './base-client';

export interface GetPostBySlugOptions extends ApiRequestOptions {
  trackView?: boolean;
}

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

  /**
   * 슬러그로 단일 포스트를 조회합니다.
   * `trackView`를 false로 전달하면 조회수 증가 없이 데이터를 조회합니다.
   */
  async getPostBySlug(
    slug: string,
    options: GetPostBySlugOptions = {},
  ): Promise<ApiResponse<PostResponseDto>> {
    const { trackView, ...requestOptions } = options;
    const queryString = typeof trackView === 'boolean'
      ? buildQueryParams({ trackView })
      : '';

    return request<PostResponseDto>(`/api/posts/${slug}${queryString}`, requestOptions);
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
