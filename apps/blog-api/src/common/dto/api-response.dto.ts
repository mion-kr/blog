import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ApiPaginationMeta } from '@repo/shared';

/**
 * API 응답의 메타데이터 (페이지네이션용)
 * @repo/shared의 ApiPaginationMeta 인터페이스를 구현하여 Swagger 문서화 지원
 */
export class ApiResponseMeta implements ApiPaginationMeta {
  @ApiProperty({
    description: '전체 항목 수',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: '현재 페이지 번호 (1부터 시작)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: '다음 페이지 존재 여부',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: '이전 페이지 존재 여부',
    example: false,
  })
  hasPrev: boolean;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 5,
    required: false,
  })
  totalPages?: number;
}

/**
 * 기본 API 응답 DTO
 * ResponseInterceptor에서 생성하는 응답 구조와 일치
 */
export class ApiResponseDto<T = any> {
  @ApiProperty({
    description: '요청 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '응답 메시지',
    example: '요청이 완료되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '응답 데이터',
    nullable: true,
  })
  data: T;

  @ApiProperty({
    description: 'ISO 8601 형식의 타임스탬프',
    example: '2025-09-12T06:17:45.706Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '요청 경로',
    example: '/api/posts?page=1&limit=10',
  })
  path: string;
}

/**
 * 페이지네이션이 포함된 API 응답 DTO
 */
export class PaginatedApiResponseDto<T = any> extends ApiResponseDto<T> {
  @ApiProperty({
    description: '페이지네이션 메타데이터',
    type: ApiResponseMeta,
  })
  @Type(() => ApiResponseMeta)
  meta: ApiResponseMeta;
}
