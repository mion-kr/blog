import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * 설정 모듈
 *
 * 블로그 전반적인 설정을 관리하는 모듈:
 * - 블로그 기본 정보 (제목, 설명, URL)
 * - 포스트 기본 설정 (페이지당 포스트 수)
 * - ADMIN 권한 전용
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
