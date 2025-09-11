import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { UpdateCategoryDto as IUpdateCategoryDto } from '@repo/shared';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) implements IUpdateCategoryDto {
  @ApiPropertyOptional({
    description: '카테고리 이름',
    example: '수정된 카테고리',
    minLength: 1,
    maxLength: 50,
  })
  name?: string;

  @ApiPropertyOptional({
    description: '카테고리 슬러그 (URL 친화적 문자열)',
    example: 'updated-category',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: '카테고리 설명',
    example: '수정된 카테고리 설명입니다.',
    maxLength: 500,
  })
  description?: string;

  @ApiPropertyOptional({
    description: '카테고리 테마 색상 (hex 코드)',
    example: '#10B981',
    pattern: '^#[0-9A-F]{6}$',
  })
  color?: string;
}