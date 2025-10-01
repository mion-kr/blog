import {
  ApiResponse,
  PaginatedResponse,
  PostResponseDto,
  PostsQuery,
  Category,
  Tag,
  CategoriesQuery,
  TagsQuery,
  BlogSettings,
  UpdateBlogSettingsDto,
} from '@repo/shared';
import {
  ApiError,
  ReauthenticationRequiredError,
  isReauthenticationResponse,
} from './api-errors';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * API 요청 설정 인터페이스
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

/**
 * 기본 API 요청 함수
 */
export async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, token } = options;

  const url = `${API_BASE_URL}${endpoint}`;
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const hasBody = response.status !== 204;
    const contentType = response.headers.get('content-type') ?? '';

    let data: ApiResponse<T> | undefined;

    if (hasBody && contentType.includes('application/json')) {
      data = (await response.json()) as ApiResponse<T>;
    } else if (hasBody) {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text) as ApiResponse<T>;
      }
    }

    if (!data) {
      data = response.ok
        ? {
            success: true,
            message: '요청이 성공했어요.',
            timestamp: new Date().toISOString(),
            path: endpoint,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: undefined as any,
          }
        : {
            success: false,
            message: '서버 응답이 비어 있습니다.',
            timestamp: new Date().toISOString(),
            path: endpoint,
            error: {
              code: 'UNKNOWN_ERROR',
              statusCode: response.status,
            },
          };
    }

    if (!response.ok) {
      const errorData = data as ApiResponse<unknown>;
      const isError = isErrorResponse(errorData);

      if (isReauthenticationResponse(errorData, response.status)) {
        throw new ReauthenticationRequiredError(
          response.status,
          errorData.message ?? '세션이 만료되었어요. 다시 로그인해 주세요.',
          isError ? errorData.error.details : undefined,
          response.status === 403 ? 'FORBIDDEN' : 'SESSION_EXPIRED'
        );
      }

      throw new ApiError(
        response.status,
        isError ? errorData.error.code : 'UNKNOWN_ERROR',
        errorData.message ?? 'An error occurred',
        isError ? errorData.error.details : undefined
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // 네트워크 에러 등 예상치 못한 에러
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network error occurred'
    );
  }
}

/**
 * 쿼리 파라미터를 URL 검색 파라미터로 변환
 */
function ensureAuthToken(token: string | undefined, context: string) {
  if (!token) {
    throw new ApiError(401, 'MISSING_TOKEN', `${context} 호출에 인증 토큰이 필요합니다.`);
  }
}

function buildQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * 포스트 API 클라이언트
 */
export const postsApi = {
  /**
   * 포스트 목록 조회
   */
  async getPosts(
    query: PostsQuery = {},
    options: ApiRequestOptions = {}
  ): Promise<PaginatedResponse<PostResponseDto>> {
    const queryString = buildQueryParams(query as Record<string, unknown>);
    const response = await request<PostResponseDto[]>(
      `/api/posts${queryString}`,
      options
    );

    return response as PaginatedResponse<PostResponseDto>;
  },

  /**
   * 특정 포스트 조회 (슬러그 기반)
   */
  async getPostBySlug(
    slug: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<PostResponseDto>> {
    return request<PostResponseDto>(`/api/posts/${slug}`, options);
  },

  /**
   * 특정 포스트 조회 (ID 기반)
   */
  async getPostById(
    id: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<PostResponseDto>> {
    return request<PostResponseDto>(`/api/posts/id/${id}`, options);
  },

  async createPost(
    payload: unknown,
    options: ApiRequestOptions
  ): Promise<ApiResponse<PostResponseDto>> {
    ensureAuthToken(options.token, 'POST /api/posts');
    return apiClient.post<PostResponseDto>('/api/posts', payload, options);
  },

  async updatePost(
    slug: string,
    payload: unknown,
    options: ApiRequestOptions
  ): Promise<ApiResponse<PostResponseDto>> {
    ensureAuthToken(options.token, `PUT /api/posts/${slug}`);
    return apiClient.put<PostResponseDto>(`/api/posts/${slug}`, payload, options);
  },

  async deletePost(
    slug: string,
    options: ApiRequestOptions
  ): Promise<ApiResponse<null>> {
    ensureAuthToken(options.token, `DELETE /api/posts/${slug}`);
    return apiClient.delete<null>(`/api/posts/${slug}`, options);
  },

};

/**
 * 카테고리 API 클라이언트
 */
export const categoriesApi = {
  /**
   * 카테고리 목록 조회
   */
  async getCategories(
    query: CategoriesQuery = {},
    options: ApiRequestOptions = {}
  ): Promise<PaginatedResponse<Category>> {
    const queryString = buildQueryParams(query as Record<string, unknown>);
    const response = await request<Category[]>(
      `/api/categories${queryString}`,
      options
    );

    return response as PaginatedResponse<Category>;
  },

  /**
   * 슬러그 기반 카테고리 상세 조회
   */
  async getCategoryBySlug(
    slug: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<Category>> {
    return request<Category>(`/api/categories/${slug}`, options);
  },

  async createCategory(
    payload: unknown,
    options: ApiRequestOptions
  ): Promise<ApiResponse<Category>> {
    ensureAuthToken(options.token, 'POST /api/categories');
    return apiClient.post<Category>('/api/categories', payload, options);
  },

  async updateCategory(
    slug: string,
    payload: unknown,
    options: ApiRequestOptions
  ): Promise<ApiResponse<Category>> {
    ensureAuthToken(options.token, `PUT /api/categories/${slug}`);
    return apiClient.put<Category>(`/api/categories/${slug}`, payload, options);
  },

  async deleteCategory(
    slug: string,
    options: ApiRequestOptions
  ): Promise<ApiResponse<null>> {
    ensureAuthToken(options.token, `DELETE /api/categories/${slug}`);
    return apiClient.delete<null>(`/api/categories/${slug}`, options);
  },
};

/**
 * 태그 API 클라이언트
 */
export const tagsApi = {
  /**
   * 태그 목록 조회
   */
  async getTags(
    query: TagsQuery = {},
    options: ApiRequestOptions = {}
  ): Promise<PaginatedResponse<Tag>> {
    const queryString = buildQueryParams(query as Record<string, unknown>);
    const response = await request<Tag[]>(`/api/tags${queryString}`, options);

    return response as PaginatedResponse<Tag>;
  },

  /**
   * 슬러그 기반 태그 상세 조회
   */
  async getTagBySlug(
    slug: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<Tag>> {
    return request<Tag>(`/api/tags/${slug}`, options);
  },

  async createTag(
    payload: unknown,
    options: ApiRequestOptions
  ): Promise<ApiResponse<Tag>> {
    ensureAuthToken(options.token, 'POST /api/tags');
    return apiClient.post<Tag>('/api/tags', payload, options);
  },

  async updateTag(
    slug: string,
    payload: unknown,
    options: ApiRequestOptions
  ): Promise<ApiResponse<Tag>> {
    ensureAuthToken(options.token, `PUT /api/tags/${slug}`);
    return apiClient.put<Tag>(`/api/tags/${slug}`, payload, options);
  },

  async deleteTag(
    slug: string,
    options: ApiRequestOptions
  ): Promise<ApiResponse<null>> {
    ensureAuthToken(options.token, `DELETE /api/tags/${slug}`);
    return apiClient.delete<null>(`/api/tags/${slug}`, options);
  },
};

/**
 * API 클라이언트 메인 객체
 */
export const apiClient = {
  request,
  get<T>(endpoint: string, options: ApiRequestOptions = {}) {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },
  post<T>(endpoint: string, body: unknown, options: ApiRequestOptions) {
    ensureAuthToken(options.token, `POST ${endpoint}`);
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },
  put<T>(endpoint: string, body: unknown, options: ApiRequestOptions) {
    ensureAuthToken(options.token, `PUT ${endpoint}`);
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },
  delete<T>(endpoint: string, options: ApiRequestOptions) {
    ensureAuthToken(options.token, `DELETE ${endpoint}`);
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
  withToken(token: string) {
    return {
      request: <T>(endpoint: string, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token }),
      get: <T>(endpoint: string, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'GET' }),
      post: <T>(endpoint: string, body: unknown, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'POST', body }),
      put: <T>(endpoint: string, body: unknown, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'PUT', body }),
      delete: <T>(endpoint: string, options: ApiRequestOptions = {}) =>
        request<T>(endpoint, { ...options, token, method: 'DELETE' }),
    };
  },
  posts: postsApi,
  categories: categoriesApi,
  tags: tagsApi,
  settings: {
    async getSettings(options: ApiRequestOptions): Promise<ApiResponse<BlogSettings>> {
      ensureAuthToken(options.token, 'GET /api/admin/settings');
      return request<BlogSettings>('/api/admin/settings', options);
    },
    async updateSettings(
      payload: UpdateBlogSettingsDto,
      options: ApiRequestOptions
    ): Promise<ApiResponse<BlogSettings>> {
      ensureAuthToken(options.token, 'PATCH /api/admin/settings');
      return request<BlogSettings>('/api/admin/settings', {
        ...options,
        method: 'PATCH',
        body: payload,
      });
    },
  },
};

/**
 * 타입 가드: API 성공 응답 확인
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true } {
  return response.success === true;
}

/**
 * 타입 가드: API 에러 응답 확인
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: false } {
  return response.success === false;
}
