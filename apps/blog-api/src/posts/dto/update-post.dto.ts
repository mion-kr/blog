import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';
import { UpdatePostDto as IUpdatePostDto } from '@repo/shared';

export class UpdatePostDto
  extends PartialType(CreatePostDto)
  implements IUpdatePostDto
{
  @ApiPropertyOptional({
    description: '포스트 제목',
    example: '수정된 포스트 제목',
    minLength: 1,
    maxLength: 200,
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'MDX 형식의 포스트 내용',
    example: '# 수정된 내용\n\n업데이트된 **MDX** 포스트입니다.',
  })
  content?: string;

  @ApiPropertyOptional({
    description: '포스트 요약',
    example: '수정된 포스트 요약입니다.',
    maxLength: 500,
  })
  excerpt?: string;

  @ApiPropertyOptional({
    description: '커버 이미지 URL',
    example: 'https://example.com/new-cover-image.jpg',
  })
  coverImage?: string;

  @ApiPropertyOptional({
    description: '발행 상태',
    example: false,
  })
  published?: boolean;

  @ApiPropertyOptional({
    description: '카테고리 ID (UUID)',
    example: '01234567-89ab-cdef-0123-456789abcdef',
    format: 'uuid',
  })
  categoryId?: string;

  @ApiPropertyOptional({
    description: '태그 ID 배열 (UUID 배열)',
    example: [
      '01234567-89ab-cdef-0123-456789abcdef',
      '12345678-9abc-def0-1234-56789abcdef0',
    ],
    type: [String],
    isArray: true,
  })
  tagIds?: string[];
}
