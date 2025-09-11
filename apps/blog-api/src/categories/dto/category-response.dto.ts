import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Category } from '@repo/shared';

export class CategoryResponseDto implements Category {
  @ApiProperty({
    description: '카테고리 ID',
    example: '01JD6X5Z7K8N3M2P1Q4R6S9T8V',
    format: 'uuidv7',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '카테고리 이름',
    example: '개발',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: '카테고리 슬러그',
    example: 'development',
  })
  @Expose()
  slug: string;

  @ApiPropertyOptional({
    description: '카테고리 설명',
    example: '개발 관련 포스트들을 모아놓은 카테고리입니다.',
  })
  @Expose()
  description?: string;

  @ApiPropertyOptional({
    description: '카테고리 테마 색상 (hex 코드)',
    example: '#3B82F6',
  })
  @Expose()
  color?: string;

  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiProperty({
    description: '포스트 수',
    example: 5,
    minimum: 0,
  })
  @Expose()
  postCount: number;

  constructor(partial: Partial<CategoryResponseDto>) {
    Object.assign(this, partial);
  }
}