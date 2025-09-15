import { ErrorCode } from '../enums/error-codes.enum';

/**
 * 사용자 친화적인 에러 메시지 매핑
 * GlobalExceptionFilter에서 ErrorCode에 따른 적절한 메시지를 제공하기 위해 사용됩니다.
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // === 일반적인 HTTP 에러들 ===
  [ErrorCode.BAD_REQUEST]: '잘못된 요청입니다. 입력 데이터를 확인해주세요.',
  [ErrorCode.UNAUTHORIZED]: '인증이 필요합니다. 로그인 후 다시 시도해주세요.',
  [ErrorCode.FORBIDDEN]: '접근 권한이 없습니다.',
  [ErrorCode.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [ErrorCode.CONFLICT]: '데이터 충돌이 발생했습니다.',
  [ErrorCode.UNPROCESSABLE_ENTITY]: '요청 데이터를 처리할 수 없습니다.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',

  // === 포스트 관련 에러들 ===
  [ErrorCode.POST_NOT_FOUND]: '해당 포스트를 찾을 수 없습니다.',
  [ErrorCode.POST_SLUG_DUPLICATE]: '이미 사용 중인 포스트 슬러그입니다.',
  [ErrorCode.POST_ALREADY_PUBLISHED]: '이미 게시된 포스트입니다.',
  [ErrorCode.POST_NOT_PUBLISHED]: '게시되지 않은 포스트입니다.',

  // === 카테고리 관련 에러들 ===
  [ErrorCode.CATEGORY_NOT_FOUND]: '해당 카테고리를 찾을 수 없습니다.',
  [ErrorCode.CATEGORY_SLUG_DUPLICATE]: '이미 사용 중인 카테고리 슬러그입니다.',
  [ErrorCode.CATEGORY_HAS_POSTS]: '해당 카테고리에 포스트가 존재하여 삭제할 수 없습니다.',

  // === 태그 관련 에러들 ===
  [ErrorCode.TAG_NOT_FOUND]: '해당 태그를 찾을 수 없습니다.',
  [ErrorCode.TAG_SLUG_DUPLICATE]: '이미 사용 중인 태그 슬러그입니다.',
  [ErrorCode.TAG_HAS_POSTS]: '해당 태그가 사용된 포스트가 존재하여 삭제할 수 없습니다.',

  // === 인증/인가 관련 에러들 ===
  [ErrorCode.INVALID_JWT_TOKEN]: '유효하지 않은 인증 토큰입니다.',
  [ErrorCode.JWT_TOKEN_EXPIRED]: '인증 토큰이 만료되었습니다. 다시 로그인해주세요.',
  [ErrorCode.JWT_TOKEN_MALFORMED]: '잘못된 형식의 인증 토큰입니다.',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: '해당 작업을 수행할 권한이 없습니다.',
  [ErrorCode.ADMIN_ONLY_RESOURCE]: '관리자 권한이 필요한 기능입니다.',

  // === 데이터베이스 관련 에러들 ===
  [ErrorCode.DATABASE_CONNECTION_FAILED]: '데이터베이스 연결에 실패했습니다.',
  [ErrorCode.DATABASE_QUERY_FAILED]: '데이터베이스 작업 중 오류가 발생했습니다.',
  [ErrorCode.UNIQUE_CONSTRAINT_VIOLATION]: '중복된 데이터가 존재합니다.',
  [ErrorCode.FOREIGN_KEY_CONSTRAINT_VIOLATION]: '관련 데이터가 존재하지 않습니다.',
  [ErrorCode.CHECK_CONSTRAINT_VIOLATION]: '데이터 제약 조건을 위반했습니다.',
  [ErrorCode.NOT_NULL_CONSTRAINT_VIOLATION]: '필수 데이터가 누락되었습니다.',

  // === 유효성 검사 에러들 ===
  [ErrorCode.VALIDATION_FAILED]: '입력 데이터 유효성 검사에 실패했습니다.',
  [ErrorCode.INVALID_REQUEST_FORMAT]: '요청 형식이 올바르지 않습니다.',
  [ErrorCode.INVALID_QUERY_PARAMETERS]: '쿼리 매개변수가 올바르지 않습니다.',
  [ErrorCode.INVALID_REQUEST_BODY]: '요청 본문이 올바르지 않습니다.',
  [ErrorCode.INVALID_PATH_PARAMETERS]: '경로 매개변수가 올바르지 않습니다.',

  // === 파일 업로드 관련 에러들 ===
  [ErrorCode.FILE_TOO_LARGE]: '파일 크기가 너무 큽니다.',
  [ErrorCode.INVALID_FILE_TYPE]: '지원하지 않는 파일 형식입니다.',
  [ErrorCode.FILE_UPLOAD_FAILED]: '파일 업로드에 실패했습니다.',

  // === CSRF 보안 관련 에러들 ===
  [ErrorCode.CSRF_TOKEN_MISSING]: 'CSRF 토큰이 누락되었습니다.',
  [ErrorCode.CSRF_TOKEN_INVALID]: 'CSRF 토큰이 유효하지 않습니다.',

  // === 외부 서비스 관련 에러들 ===
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: '외부 서비스를 사용할 수 없습니다.',
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: '외부 서비스 응답 시간이 초과되었습니다.',
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: '외부 서비스에서 오류가 발생했습니다.',
};

/**
 * 개발 환경에서 사용할 상세 에러 메시지
 * 운영 환경에서는 보안상 노출하지 않습니다.
 */
export const DevelopmentErrorMessages: Record<ErrorCode, string> = {
  ...ErrorMessages,
  
  // 개발 환경에서는 더 구체적인 메시지 제공
  [ErrorCode.DATABASE_CONNECTION_FAILED]: '데이터베이스 연결에 실패했습니다. 연결 문자열과 네트워크 상태를 확인하세요.',
  [ErrorCode.DATABASE_QUERY_FAILED]: '데이터베이스 쿼리 실행 중 오류가 발생했습니다. SQL 문법과 데이터 무결성을 확인하세요.',
  [ErrorCode.INTERNAL_SERVER_ERROR]: '서버 내부 오류가 발생했습니다. 로그를 확인하여 상세한 원인을 파악하세요.',
};