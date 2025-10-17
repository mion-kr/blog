import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AdminGuard } from '../auth/guards/admin.guard';
import {
  ResponseMessage,
  User,
  CurrentUser,
  ApiAdminPatch,
} from '../common/decorators';
import { SettingsService } from './settings.service';
import { SettingsResponseDto, UpdateSettingsDto } from './dto';

/**
 * 블로그 설정 API 컨트롤러
 *
 * 엔드포인트:
 * - GET /api/admin/settings - 설정 조회 (ADMIN 전용)
 * - PATCH /api/admin/settings - 설정 업데이트 (ADMIN 전용)
 */
@ApiTags('admin/settings')
@ApiExtraModels(SettingsResponseDto)
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 전체 설정 조회
   */
  @Get()
  @ApiOperation({
    summary: '블로그 설정 조회',
    description: 'ADMIN 권한으로 모든 블로그 설정을 조회합니다.',
  })
  @ApiOkResponse({
    description: '설정 조회 성공',
    type: SettingsResponseDto,
  })
  async findAll(): Promise<SettingsResponseDto> {
    return this.settingsService.findAll();
  }

  /**
   * 설정 업데이트
   */
  @Patch()
  @ApiAdminPatch(
    SettingsResponseDto,
    '블로그 설정 업데이트',
    'ADMIN 권한으로 블로그 설정을 업데이트합니다.',
    '설정이 업데이트되었습니다.',
  )
  @ResponseMessage('설정이 업데이트되었습니다.')
  async update(
    @Body() updateSettingsDto: UpdateSettingsDto,
    @User() user: CurrentUser,
  ): Promise<SettingsResponseDto> {
    return this.settingsService.update(updateSettingsDto, user.id);
  }
}
