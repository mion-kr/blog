import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsUUID,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  ArrayMinSize,
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

  @ApiPropertyOptional({
    description: 'pre-signed 업로드 응답에서 전달된 커버 이미지 객체 키',
    example: 'development/draft/123e4567/thumbnail/1728361923-cover.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  coverImageKey?: string;

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
    description: '태그 ID 배열 (UUID 배열, 최소 1개 필수)',
    example: [
      '01234567-89ab-cdef-0123-456789abcdef',
      '12345678-9abc-def0-1234-56789abcdef0',
    ],
    type: [String],
    isArray: true,
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '최소 1개 이상의 태그를 선택해야 합니다.' })
  @IsUUID('7', {
    each: true,
    message: '모든 태그 ID는 올바른 UUIDv7 형식이어야 합니다.',
  })
  tagIds: string[];

  @ApiPropertyOptional({
    description:
      '파일 업로드 세션을 구분하는 Draft UUID (pre-signed 요청과 동일한 UUIDv7)',
    example: '018f1aeb-4b58-79f7-b555-725f0c602114',
    format: 'uuidv7',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID('7', { message: 'Draft UUID는 UUIDv7 형식이어야 합니다.' })
  draftUuid?: string;
}
