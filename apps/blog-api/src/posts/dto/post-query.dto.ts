import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  IsNumberString,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PostsQuery } from '@repo/shared';

export class PostQueryDto implements PostsQuery {
  @ApiPropertyOptional({
    description: '페이지 번호',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1, { message: '페이지 번호는 1 이상이어야 합니다.' })
  page?: number;

  @ApiPropertyOptional({
    description: '페이지당 항목 수',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1, { message: '페이지당 항목 수는 1 이상이어야 합니다.' })
  @Max(100, { message: '페이지당 항목 수는 100 이하여야 합니다.' })
  limit?: number;

  @ApiPropertyOptional({
    description: '정렬 기준 필드',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'publishedAt', 'title', 'viewCount'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'publishedAt', 'title', 'viewCount'], {
    message: '정렬 기준은 createdAt, updatedAt, publishedAt, title, viewCount 중 하나여야 합니다.',
  })
  sort?: string;

  @ApiPropertyOptional({
    description: '정렬 순서',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'], { message: '정렬 순서는 asc 또는 desc여야 합니다.' })
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: '발행 상태 필터',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  published?: boolean;

  @ApiPropertyOptional({
    description: '카테고리 ID 필터 (UUID)',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  @IsUUID('7', { message: '올바른 카테고리 UUIDv7 형식이어야 합니다.' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: '태그 ID 필터 (UUID)',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  @IsUUID('7', { message: '올바른 태그 UUIDv7 형식이어야 합니다.' })
  tagId?: string;

  @ApiPropertyOptional({
    description: '제목 또는 내용에서 검색할 키워드',
    example: 'Next.js',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '작성자 ID 필터 (UUID)',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  @IsUUID('7', { message: '올바른 작성자 UUIDv7 형식이어야 합니다.' })
  authorId?: string;
}