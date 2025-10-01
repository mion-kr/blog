import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: '사이트 제목 (1-60자)',
    example: "Mion's Blog",
    minLength: 1,
    maxLength: 60,
  })
  @IsOptional()
  @IsString({ message: '사이트 제목은 문자열로 입력해주세요.' })
  @Length(1, 60, {
    message: '사이트 제목은 1자 이상 60자 이하로 입력해주세요.',
  })
  siteTitle?: string;

  @ApiPropertyOptional({
    description: '사이트 설명 (1-160자)',
    example: '개발과 기술에 관한 이야기를 나눕니다.',
    minLength: 1,
    maxLength: 160,
  })
  @IsOptional()
  @IsString({ message: '사이트 설명은 문자열로 입력해주세요.' })
  @Length(1, 160, {
    message: '사이트 설명은 1자 이상 160자 이하로 작성해주세요.',
  })
  siteDescription?: string;

  @ApiPropertyOptional({
    description: '사이트 URL (http:// 또는 https:// 형식)',
    example: 'https://mionblog.com',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'] },
    {
      message:
        '사이트 URL은 http:// 또는 https://로 시작하고, .com이나 .dev 등으로 끝나는 올바른 주소여야 해요.',
    },
  )
  siteUrl?: string;

  @ApiPropertyOptional({
    description: '페이지당 포스트 수 (5-50)',
    example: 10,
    minimum: 5,
    maximum: 50,
  })
  @IsOptional()
  @IsInt({ message: '페이지당 포스트 수는 숫자로 입력해주세요.' })
  @Min(5, { message: '페이지당 포스트 수는 최소 5개 이상이어야 해요.' })
  @Max(50, { message: '페이지당 포스트 수는 최대 50개까지 설정할 수 있어요.' })
  postsPerPage?: number;
}
