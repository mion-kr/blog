import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CategoriesQuery } from '@repo/shared';

export class CategoryQueryDto implements CategoriesQuery {
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
    enum: ['createdAt', 'updatedAt', 'name', 'postCount'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'name', 'postCount'], {
    message: '정렬 기준은 createdAt, updatedAt, name, postCount 중 하나여야 합니다.',
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
    description: '카테고리 이름에서 검색할 키워드',
    example: '개발',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  search?: string;
}