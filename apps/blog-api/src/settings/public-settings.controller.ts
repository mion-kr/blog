import { Controller, Get } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { PublicSettingsResponseDto } from './dto/public-settings-response.dto';
import { ApiPublicSingle } from '../common/decorators';

@ApiTags('site/settings')
@ApiExtraModels(PublicSettingsResponseDto)
@Controller('site/settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiPublicSingle(
    PublicSettingsResponseDto,
    '공개 사이트 설정 조회',
    'About 페이지 등 공개 화면에 필요한 소개 정보를 반환합니다.',
  )
  @ApiOkResponse({
    description: '공개 설정 조회 성공',
    schema: {
      example: {
        success: true,
        message: '조회가 완료되었습니다.',
        timestamp: '2025-10-16T00:00:00.000Z',
        path: '/site/settings',
        data: {
          siteTitle: "Mion's Blog",
          siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
          siteUrl: 'https://mion.blog',
          profileImageUrl: 'https://cdn.mion.blog/about/main.png',
        },
      },
    },
  })
  async getPublicSettings(): Promise<PublicSettingsResponseDto> {
    const settings = await this.settingsService.findAll();
    return new PublicSettingsResponseDto({
      siteTitle: settings.siteTitle,
      siteDescription: settings.siteDescription,
      siteUrl: settings.siteUrl,
      profileImageUrl: settings.profileImageUrl ?? null,
    });
  }
}
