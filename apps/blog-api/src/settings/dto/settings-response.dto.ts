import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SettingItemDto {
  @ApiProperty({
    description: '설정 ID',
    example: '01JD6X5Z7K8N3M2P1Q4R6S9T8V',
    format: 'uuidv7',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '설정 키',
    example: 'site_title',
  })
  @Expose()
  key: string;

  @ApiProperty({
    description: '설정 값',
    example: "Mion's Blog",
  })
  @Expose()
  value: string;

  @ApiPropertyOptional({
    description: '설정 설명',
    example: '블로그 사이트 제목',
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '수정자 ID',
    example: '01JD6X5Z7K8N3M2P1Q4R6S9T8V',
  })
  @Expose()
  updatedBy?: string;

  constructor(partial: Partial<SettingItemDto>) {
    Object.assign(this, partial);
  }
}

export class SettingsResponseDto {
  @ApiProperty({
    description: '사이트 제목',
    example: "Mion's Blog",
  })
  @Expose()
  siteTitle: string;

  @ApiProperty({
    description: '사이트 설명',
    example: '개발과 기술에 관한 이야기를 나눕니다.',
  })
  @Expose()
  siteDescription: string;

  @ApiProperty({
    description: '사이트 URL',
    example: 'https://mionblog.com',
  })
  @Expose()
  siteUrl: string;

  @ApiProperty({
    description: '페이지당 포스트 수',
    example: 10,
  })
  @Expose()
  postsPerPage: number;

  @ApiPropertyOptional({
    description: 'About 페이지에서 사용하는 프로필 이미지 URL',
    example: 'https://bucket-production-d421.up.railway.app:443/production/about/01JD-profile.png',
  })
  @Expose()
  profileImageUrl?: string | null;

  constructor(partial: Partial<SettingsResponseDto>) {
    Object.assign(this, partial);
  }
}
