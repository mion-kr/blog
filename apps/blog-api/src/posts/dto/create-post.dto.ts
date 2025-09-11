import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsUUID,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { CreatePostDto as ICreatePostDto } from '@repo/shared';

export class CreatePostDto implements ICreatePostDto {
  @ApiProperty({
    description: '포스트 제목',
    example: 'Next.js 15에서 달라진 점들',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1, { message: '제목은 최소 1자 이상이어야 합니다.' })
  @MaxLength(200, { message: '제목은 최대 200자까지 가능합니다.' })
  title: string;

  @ApiProperty({
    description: 'MDX 형식의 포스트 내용',
    example: '# 안녕하세요\n\n이것은 **MDX** 포스트입니다.',
  })
  @IsString()
  @MinLength(1, { message: '내용은 필수입니다.' })
  content: string;

  @ApiProperty({
    description: '포스트 요약 (선택사항)',
    example: 'Next.js 15의 새로운 기능들에 대해 알아봅시다.',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '요약은 최대 500자까지 가능합니다.' })
  excerpt?: string;

  @ApiProperty({
    description: '커버 이미지 URL (선택사항)',
    example: 'https://example.com/cover-image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: '올바른 URL 형식이어야 합니다.' })
  coverImage?: string;

  @ApiProperty({
    description: '발행 상태',
    example: true,
    default: false,
  })
  @IsBoolean()
  published: boolean;

  @ApiProperty({
    description: '카테고리 ID (UUID)',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  @IsString()
  @IsUUID('7', { message: '올바른 UUIDv7 형식이어야 합니다.' })
  categoryId: string;

  @ApiProperty({
    description: '태그 ID 배열 (UUID 배열)',
    example: [
      '01234567-89ab-cdef-0123-456789abcdef',
      '12345678-9abc-def0-1234-56789abcdef0',
    ],
    type: [String],
    isArray: true,
  })
  @IsArray()
  @IsUUID('7', { each: true, message: '모든 태그 ID는 올바른 UUIDv7 형식이어야 합니다.' })
  tagIds: string[];
}