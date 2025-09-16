import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostWithRelations } from '@repo/shared';
import { Expose, Type } from 'class-transformer';
import { TagResponseDto } from '../../tags/dto/tag-response.dto';

export class AuthorResponseDto {
  @ApiProperty({
    description: '작성자 ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '작성자 이름',
    example: 'Mion',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: '작성자 프로필 이미지 URL',
    example: 'https://lh3.googleusercontent.com/a/example',
  })
  @Expose()
  image?: string;
}

export class PostCategoryResponseDto {
  @ApiProperty({
    description: '카테고리 ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
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
    example: '개발 관련 포스트들',
  })
  @Expose()
  description?: string;

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
}

export class PostResponseDto implements PostWithRelations {
  @ApiProperty({
    description: '포스트 ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '포스트 제목',
    example: 'Next.js 15에서 달라진 점들',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: '포스트 슬러그',
    example: 'nextjs-15-changes',
  })
  @Expose()
  slug: string;

  @ApiProperty({
    description: 'MDX 형식의 포스트 내용',
    example: '# 안녕하세요\n\n이것은 **MDX** 포스트입니다.',
  })
  @Expose()
  content: string;

  @ApiPropertyOptional({
    description: '포스트 요약',
    example: 'Next.js 15의 새로운 기능들에 대해 알아봅시다.',
  })
  @Expose()
  excerpt?: string;

  @ApiPropertyOptional({
    description: '커버 이미지 URL',
    example: 'https://example.com/cover-image.jpg',
  })
  @Expose()
  coverImage?: string;

  @ApiProperty({
    description: '발행 상태',
    example: true,
  })
  @Expose()
  published: boolean;

  @ApiProperty({
    description: '조회수',
    example: 156,
    minimum: 0,
  })
  @Expose()
  viewCount: number;

  @ApiProperty({
    description: '카테고리 ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @Expose()
  categoryId: string;

  @ApiProperty({
    description: '작성자 ID',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @Expose()
  authorId: string;

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

  @ApiPropertyOptional({
    description: '발행 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  publishedAt?: Date;

  @ApiProperty({
    description: '카테고리 정보',
    type: PostCategoryResponseDto,
  })
  @Expose()
  @Type(() => PostCategoryResponseDto)
  category: PostCategoryResponseDto;

  @ApiProperty({
    description: '태그 목록',
    type: () => [TagResponseDto],
  })
  @Expose()
  @Type(() => TagResponseDto)
  tags: TagResponseDto[];

  @ApiProperty({
    description: '작성자 정보',
    type: AuthorResponseDto,
  })
  @Expose()
  @Type(() => AuthorResponseDto)
  author: AuthorResponseDto;

  constructor(partial: Partial<PostResponseDto>) {
    Object.assign(this, partial);
  }
}
