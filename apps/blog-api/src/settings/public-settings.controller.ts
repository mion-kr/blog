import { Controller, Get } from '@nestjs/common';

import { SettingsService } from './settings.service';
import { PublicSettingsResponseDto } from './dto/public-settings-response.dto';
import { ApiPublicController, ApiPublicSingle } from '../common/decorators';

@ApiPublicController('site/settings', PublicSettingsResponseDto)
@Controller('site/settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiPublicSingle(
    PublicSettingsResponseDto,
    '공개 사이트 설정 조회',
    'About 페이지 등 공개 화면에 필요한 소개 정보를 반환합니다.',
  )
  async getPublicSettings(): Promise<PublicSettingsResponseDto> {
    return this.settingsService.findPublicSettings();
  }
}
