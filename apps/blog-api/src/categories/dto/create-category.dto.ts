import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { CreateCategoryDto as ICreateCategoryDto } from '@repo/shared';

export class CreateCategoryDto implements ICreateCategoryDto {
  @ApiProperty({
    description: '카테고리 이름',
    example: '개발',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: '카테고리 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(50, { message: '카테고리 이름은 최대 50자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '카테고리 슬러그 (URL 친화적 문자열)',
    example: 'development',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      '슬러그는 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다.',
  })
  @MaxLength(100, { message: '슬러그는 최대 100자까지 가능합니다.' })
  slug: string;

  @ApiPropertyOptional({
    description: '카테고리 설명',
    example: '개발 관련 포스트들을 모아놓은 카테고리입니다.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '설명은 최대 500자까지 가능합니다.' })
  description?: string;

  @ApiPropertyOptional({
    description: '카테고리 테마 색상 (hex 코드)',
    example: '#3B82F6',
    pattern: '^#[0-9A-F]{6}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, {
    message: '색상은 올바른 hex 코드 형식이어야 합니다. (예: #3B82F6)',
  })
  color?: string;
}
