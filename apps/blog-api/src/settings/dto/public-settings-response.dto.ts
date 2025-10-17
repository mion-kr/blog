import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PublicSettingsResponseDto {
  @ApiProperty({
    description: '사이트 제목',
    example: "Mion's Blog",
  })
  @Expose()
  siteTitle!: string;

  @ApiProperty({
    description: '사이트 설명',
    example: '개발과 기술에 관한 이야기를 나눕니다.',
  })
  @Expose()
  siteDescription!: string;

  @ApiProperty({
    description: '사이트 URL',
    example: 'https://mion.blog',
  })
  @Expose()
  siteUrl!: string;

  @ApiPropertyOptional({
    description: 'About 페이지용 프로필 이미지 URL',
    example: 'https://cdn.mion.blog/about/main.png',
  })
  @Expose()
  profileImageUrl?: string | null;

  constructor(partial: Partial<PublicSettingsResponseDto>) {
    Object.assign(this, partial);
  }
}
