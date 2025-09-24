/**
 * API 응답 인터페이스 - @repo/shared로 통합
 *
 * 이 파일은 더 이상 직접 사용하지 마세요.
 * 대신 @repo/shared의 타입들을 사용하세요:
 *
 * import {
 *   ApiResponse,
 *   BaseApiResponse,
 *   SuccessResponse,
 *   ErrorResponse,
 *   PaginationMeta
 * } from '@repo/shared';
 */

// 하위 호환성을 위해 re-export
export type {
  ApiResponse,
  BaseApiResponse,
  SuccessResponse,
  ErrorResponse,
  ErrorInfo,
  ErrorData,
  ErrorDetails,
  ValidationError,
} from '@repo/shared';

// PaginationMeta는 클래스이므로 일반 export
export { PaginationMeta } from '@repo/shared';

// ErrorCode는 여전히 blog-api에서 관리
export { ErrorCode } from '../enums/error-codes.enum';
