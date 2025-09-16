import {
  ApiResponse,
  PaginatedResponse,
  PostResponseDto,
  PostsQuery,
  Category,
  Tag,
  CategoriesQuery,
  TagsQuery,
} from '@repo/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * API 요청 설정 인터페이스
 */
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

/**
 * API 클라이언트 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 기본 API 요청 함수
 */
async function apiRequest<T>(
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

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json() as ApiResponse<T>;

    if (!response.ok) {
      const errorData = data as ApiResponse<unknown>;
      const isError = isErrorResponse(errorData);

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
function buildQueryParams(params: PostsQuery | Record<string, unknown>): string {
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
  async getPosts(query: PostsQuery = {}): Promise<PaginatedResponse<PostResponseDto>> {
    const queryString = buildQueryParams(query);
    const response = await apiRequest<PostResponseDto[]>(`/api/posts${queryString}`);
    
    return response as PaginatedResponse<PostResponseDto>;
  },

  /**
   * 특정 포스트 조회 (슬러그 기반)
   */
  async getPostBySlug(slug: string): Promise<ApiResponse<PostResponseDto>> {
    return apiRequest<PostResponseDto>(`/api/posts/${slug}`);
  },

  /**
   * 특정 포스트 조회 (ID 기반)
   */
  async getPostById(id: string): Promise<ApiResponse<PostResponseDto>> {
    return apiRequest<PostResponseDto>(`/api/posts/id/${id}`);
  },

  /**
   * 포스트 조회수 증가
   */
  async incrementViewCount(slug: string): Promise<ApiResponse<{ viewCount: number }>> {
    return apiRequest<{ viewCount: number }>(`/api/posts/${slug}/view`, {
      method: 'POST',
    });
  },
};

/**
 * 카테고리 API 클라이언트
 */
export const categoriesApi = {
  /**
   * 카테고리 목록 조회
   */
  async getCategories(query: CategoriesQuery = {}): Promise<PaginatedResponse<Category>> {
    const queryString = buildQueryParams(query);
    const response = await apiRequest<Category[]>(`/api/categories${queryString}`);

    return response as PaginatedResponse<Category>;
  },

  /**
   * 슬러그 기반 카테고리 상세 조회
   */
  async getCategoryBySlug(slug: string): Promise<ApiResponse<Category>> {
    return apiRequest<Category>(`/api/categories/${slug}`);
  },
};

/**
 * 태그 API 클라이언트
 */
export const tagsApi = {
  /**
   * 태그 목록 조회
   */
  async getTags(query: TagsQuery = {}): Promise<PaginatedResponse<Tag>> {
    const queryString = buildQueryParams(query);
    const response = await apiRequest<Tag[]>(`/api/tags${queryString}`);

    return response as PaginatedResponse<Tag>;
  },

  /**
   * 슬러그 기반 태그 상세 조회
   */
  async getTagBySlug(slug: string): Promise<ApiResponse<Tag>> {
    return apiRequest<Tag>(`/api/tags/${slug}`);
  },
};

/**
 * API 클라이언트 메인 객체
 */
export const apiClient = {
  posts: postsApi,
  categories: categoriesApi,
  tags: tagsApi,
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
