import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { Tag } from '@repo/shared';

export class TagResponseDto implements Tag {
  @ApiProperty({
    description: '태그 ID',
    example: '01JD6X5Z7K8N3M2P1Q4R6S9T8V',
    format: 'uuidv7',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '태그 이름',
    example: 'Next.js',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: '태그 슬러그',
    example: 'nextjs',
  })
  @Expose()
  slug: string;

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
    example: 3,
    minimum: 0,
  })
  @Expose()
  postCount: number;

  constructor(partial: Partial<TagResponseDto>) {
    Object.assign(this, partial);
  }
}