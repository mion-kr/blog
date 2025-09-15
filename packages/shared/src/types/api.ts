// API 응답 타입 정의

import { PaginationMeta, ApiPaginationMeta } from "../utils/pagination";

/**
 * 모든 API 응답의 기본 구조
 * 요구사항 문서 라인 447-461에 정확히 맞춘 구현
 */
export interface BaseApiResponse {
  success: boolean; // 성공/실패 여부
  message: string; // 사용자 메시지
  timestamp: string; // ISO 8601 타임스탬프
  path: string; // 요청 경로
}

/**
 * 성공 응답 구조
 */
export interface SuccessResponse<T = unknown> extends BaseApiResponse {
  success: true;
  data: T;
  meta?: ApiPaginationMeta; // 페이징 정보 (선택사항)
}

/**
 * 유효성 검사 에러 정보
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * 에러 데이터 상세 정보 (개발환경에서만 포함)
 */
export interface ErrorDetails {
  stack?: string; // 스택 트레이스 (개발환경만)
  validation?: ValidationError[]; // 유효성 검사 에러
  context?: Record<string, unknown>; // 추가 컨텍스트
  pgCode?: string; // PostgreSQL 에러 코드
  constraint?: string; // DB 제약 조건명
  table?: string; // 테이블명
}

/**
 * 에러 정보 구조
 */
export interface ErrorInfo {
  code: string; // 'POST_NOT_FOUND', 'INVALID_JWT' 등
  statusCode: number; // HTTP 상태 코드
  details?: ErrorDetails; // 상세 정보 (개발환경만)
}

/**
 * 에러 데이터 구조 (하위 호환성을 위해 유지)
 * @deprecated ErrorInfo를 직접 사용하세요
 */
export interface ErrorData {
  error: ErrorInfo;
}

/**
 * 에러 응답 구조
 */
export interface ErrorResponse extends BaseApiResponse {
  success: false;
  error: ErrorInfo; // 에러 정보를 최상위에 배치
  meta?: undefined; // 에러에는 페이징 정보 없음
}

/**
 * 모든 API 응답의 유니온 타입
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * 페이징된 데이터 결과 형식
 * 서비스 레이어에서 컨트롤러로 반환할 때 사용
 */
export interface PaginatedData<T = unknown> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * 페이징된 API 응답 형식
 * 실제 클라이언트에게 반환되는 구조
 */
export type PaginatedResponse<T = unknown> = SuccessResponse<T[]> & {
  meta: ApiPaginationMeta;
};

/**
 * 페이지네이션 쿼리 매개변수
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

/**
 * 포스트 검색 및 필터 쿼리 매개변수
 */
export interface PostsQuery extends PaginationQuery {
  published?: boolean;
  categoryId?: string;
  tagId?: string;
  search?: string; // 제목이나 내용에서 검색
  authorId?: string;
}

/**
 * 카테고리 검색 쿼리 매개변수
 */
export interface CategoriesQuery extends PaginationQuery {
  search?: string;
}

/**
 * 태그 검색 쿼리 매개변수
 */
export interface TagsQuery extends PaginationQuery {
  search?: string;
}

/**
 * 인증 로그인 응답 (NextAuth.js와 호환)
 */
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
