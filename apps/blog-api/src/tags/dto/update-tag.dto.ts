import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateTagDto } from './create-tag.dto';
import { UpdateTagDto as IUpdateTagDto } from '@repo/shared';

export class UpdateTagDto extends PartialType(CreateTagDto) implements IUpdateTagDto {
  @ApiPropertyOptional({
    description: '태그 이름',
    example: '수정된 태그',
    minLength: 1,
    maxLength: 30,
  })
  name?: string;

  @ApiPropertyOptional({
    description: '태그 슬러그 (URL 친화적 문자열)',
    example: 'updated-tag',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  slug?: string;
}