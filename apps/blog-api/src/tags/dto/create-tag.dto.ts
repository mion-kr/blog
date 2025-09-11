import { ApiProperty } from '@nestjs/swagger';
import { CreateTagDto as ICreateTagDto } from '@repo/shared';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto implements ICreateTagDto {
  @ApiProperty({
    description: '태그 이름',
    example: 'Next.js',
    minLength: 1,
    maxLength: 30,
  })
  @IsString()
  @MinLength(1, { message: '태그 이름은 최소 1자 이상이어야 합니다.' })
  @MaxLength(30, { message: '태그 이름은 최대 30자까지 가능합니다.' })
  name: string;

  @ApiProperty({
    description: '태그 슬러그 (URL 친화적 문자열)',
    example: 'nextjs',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      '슬러그는 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다.',
  })
  @MaxLength(50, { message: '슬러그는 최대 50자까지 가능합니다.' })
  slug: string;
}
