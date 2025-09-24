import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';

import { ApiResponseDto, PaginatedApiResponseDto } from '../dto';

/**
 * 공통 에러 응답 데코레이터
 * 자주 사용되는 HTTP 에러 응답들을 묶어서 정의
 */
export function ApiCommonErrors() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: '잘못된 요청 데이터',
    }),
    ApiResponse({
      status: 500,
      description: '서버 내부 오류',
    }),
  );
}

/**
 * 인증이 필요한 엔드포인트의 공통 에러 응답
 */
export function ApiAuthErrors() {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiCommonErrors(),
  );
}

/**
 * ADMIN 권한이 필요한 엔드포인트의 공통 에러 응답
 */
export function ApiAdminErrors() {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: '인증 실패',
    }),
    ApiResponse({
      status: 403,
      description: 'ADMIN 권한 필요 또는 CSRF 토큰 누락',
    }),
    ApiCommonErrors(),
  );
}

/**
 * 리소스 조회 시 사용되는 공통 에러 응답
 */
export function ApiNotFoundError(resourceName?: string) {
  const description = resourceName
    ? `${resourceName}을(를) 찾을 수 없음`
    : '리소스를 찾을 수 없음';

  return applyDecorators(
    ApiResponse({
      status: 404,
      description,
    }),
  );
}

/**
 * 리소스 중복 시 사용되는 에러 응답
 */
export function ApiConflictError(message?: string) {
  const description = message || '리소스 중복';

  return applyDecorators(
    ApiResponse({
      status: 409,
      description,
    }),
  );
}

/**
 * ADMIN 전용 생성 엔드포인트 데코레이터
 * 성공 응답과 ADMIN 에러들을 함께 정의
 */
export function ApiAdminCreate<TModel extends Type<any>>(
  responseType: TModel,
  summary: string,
  description?: string,
) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary,
      description:
        description ||
        'ADMIN 권한이 필요합니다. CSRF 토큰도 함께 전송해야 합니다.',
    }),
    ApiResponse({
      status: 201,
      description: '생성 성공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(responseType) },
              message: { example: '생성이 완료되었습니다.' },
            },
          },
        ],
      },
    }),
    ApiAdminErrors(),
  );
}

/**
 * ADMIN 전용 수정 엔드포인트 데코레이터
 * slug 파라미터와 성공 응답, ADMIN 에러들을 함께 정의
 */
export function ApiAdminUpdate<TModel extends Type<any>>(
  responseType: TModel,
  summary: string,
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary,
      description:
        description ||
        'ADMIN 권한이 필요합니다. CSRF 토큰도 함께 전송해야 합니다.',
    }),
    ApiParam({
      name: 'slug',
      description: `수정할 ${resourceName}의 슬러그`,
      example: 'nextjs-15-changes',
    }),
    ApiResponse({
      status: 200,
      description: `${resourceName} 수정 성공`,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(responseType) },
              message: { example: '수정이 완료되었습니다.' },
            },
          },
        ],
      },
    }),
    ApiAdminErrors(),
    ApiNotFoundError(resourceName),
  );
}

/**
 * ADMIN 전용 삭제 엔드포인트 데코레이터
 * slug 파라미터와 성공 응답, ADMIN 에러들을 함께 정의
 */
export function ApiAdminDelete(
  summary: string,
  resourceName: string,
  description?: string,
) {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary,
      description:
        description ||
        'ADMIN 권한이 필요합니다. CSRF 토큰도 함께 전송해야 합니다.',
    }),
    ApiParam({
      name: 'slug',
      description: `삭제할 ${resourceName}의 슬러그`,
      example: 'nextjs-15-changes',
    }),
    ApiResponse({
      status: 204,
      description: `${resourceName} 삭제 성공`,
    }),
    ApiAdminErrors(),
    ApiNotFoundError(resourceName),
  );
}

/**
 * 공개 목록 조회 엔드포인트 데코레이터
 */
export function ApiPublicList<TModel extends Type<any>>(
  responseType: TModel,
  summary: string,
  description: string,
) {
  return applyDecorators(
    ApiOperation({
      summary,
      description,
    }),
    ApiResponse({
      status: 200,
      description: '목록 조회 성공',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedApiResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(responseType) },
              },
              message: {
                example: '0개의 항목을 조회했습니다.',
                description: '조회된 항목 수에 따라 동적으로 변경됩니다.',
              },
            },
          },
        ],
      },
    }),
    ApiCommonErrors(),
  );
}

/**
 * 공개 상세 조회 엔드포인트 데코레이터
 */
export function ApiPublicDetail<TModel extends Type<any>>(
  responseType: TModel,
  summary: string,
  resourceName: string,
  description: string,
) {
  return applyDecorators(
    ApiOperation({
      summary,
      description,
    }),
    ApiParam({
      name: 'slug',
      description: `${resourceName} 슬러그`,
      example: 'nextjs-15-changes',
    }),
    ApiResponse({
      status: 200,
      description: `${resourceName} 조회 성공`,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              data: { $ref: getSchemaPath(responseType) },
              message: { example: '조회가 완료되었습니다.' },
            },
          },
        ],
      },
    }),
    ApiNotFoundError(resourceName),
    ApiCommonErrors(),
  );
}
