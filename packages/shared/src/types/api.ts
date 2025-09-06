// API 응답 타입 정의

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  error?: string;
}

// Query parameters for pagination
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

// Search and filter parameters
export interface PostsQuery extends PaginationQuery {
  published?: boolean;
  categoryId?: string;
  tagId?: string;
  search?: string; // 제목이나 내용에서 검색
  authorId?: string;
}

export interface CategoriesQuery extends PaginationQuery {
  search?: string;
}

export interface TagsQuery extends PaginationQuery {
  search?: string;
}

// Authentication related types
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string;
  };
  error?: string;
}