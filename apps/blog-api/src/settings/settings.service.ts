import { Inject, Injectable } from '@nestjs/common';

import {
  PublicSettingsResponseDto,
  SettingsResponseDto,
  UpdateSettingsDto,
} from './dto';
import {
  mapSettingsRowsToResponse,
  mapSettingsToPublicResponse,
} from './application/settings-response.mapper';
import { UploadsService } from '../uploads/uploads.service';
import {
  SettingKey,
  SETTINGS_REPOSITORY,
  SettingsRepository,
  SettingsUpsertEntry,
} from './repositories/settings.repository';

/**
 * 설정 use-case를 처리하는 서비스입니다.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly uploadsService: UploadsService,
    @Inject(SETTINGS_REPOSITORY)
    private readonly settingsRepository: SettingsRepository,
  ) {}

  /**
   * 전체 설정을 조회합니다.
   */
  async findAll(): Promise<SettingsResponseDto> {
    const rows = await this.settingsRepository.findAll();

    return mapSettingsRowsToResponse(rows);
  }

  /**
   * 공개 화면에 필요한 설정만 조회합니다.
   */
  async findPublicSettings(): Promise<PublicSettingsResponseDto> {
    const settings = await this.findAll();

    return mapSettingsToPublicResponse(settings);
  }

  /**
   * 설정 변경을 계산하고 저장한 뒤 최신 값을 반환합니다.
   */
  async update(
    updateSettingsDto: UpdateSettingsDto,
    userId: string,
  ): Promise<SettingsResponseDto> {
    const currentSettings = await this.findAll();
    const updates = this.collectValueUpdates(updateSettingsDto, currentSettings);

    if (
      updateSettingsDto.profileImageRemove ||
      updateSettingsDto.profileImageUrl !== undefined
    ) {
      await this.applyProfileImageUpdate(
        updateSettingsDto,
        currentSettings,
        updates,
      );
    }

    if (updates.length === 0) {
      return currentSettings;
    }

    // 변경 집합 저장은 persistence 계층에 위임합니다.
    await this.settingsRepository.upsertMany(updates, userId);

    return this.findAll();
  }

  /**
   * 단순 값 변경을 설정 업데이트 집합으로 수집합니다.
   */
  private collectValueUpdates(
    updateSettingsDto: UpdateSettingsDto,
    currentSettings: SettingsResponseDto,
  ): SettingsUpsertEntry[] {
    const updates: SettingsUpsertEntry[] = [];

    // 기본 설정 필드는 값이 실제로 바뀔 때만 저장합니다.
    if (
      updateSettingsDto.siteTitle !== undefined &&
      updateSettingsDto.siteTitle !== currentSettings.siteTitle
    ) {
      updates.push({ key: 'site_title', value: updateSettingsDto.siteTitle });
    }

    if (
      updateSettingsDto.siteDescription !== undefined &&
      updateSettingsDto.siteDescription !== currentSettings.siteDescription
    ) {
      updates.push({
        key: 'site_description',
        value: updateSettingsDto.siteDescription,
      });
    }

    if (
      updateSettingsDto.siteUrl !== undefined &&
      updateSettingsDto.siteUrl !== currentSettings.siteUrl
    ) {
      updates.push({ key: 'site_url', value: updateSettingsDto.siteUrl });
    }

    if (
      updateSettingsDto.postsPerPage !== undefined &&
      updateSettingsDto.postsPerPage !== currentSettings.postsPerPage
    ) {
      updates.push({
        key: 'posts_per_page',
        value: String(updateSettingsDto.postsPerPage),
      });
    }

    return updates;
  }

  /**
   * 프로필 이미지 관련 변경을 처리하고 설정 업데이트 집합에 반영합니다.
   */
  private async applyProfileImageUpdate(
    updateSettingsDto: UpdateSettingsDto,
    currentSettings: SettingsResponseDto,
    updates: SettingsUpsertEntry[],
  ): Promise<void> {
    let nextProfileImageUrl = currentSettings.profileImageUrl ?? null;

    if (updateSettingsDto.profileImageRemove) {
      // 프로필 이미지 제거는 현재 객체 정리 후 빈 값으로 저장합니다.
      await this.uploadsService.deleteObjectByUrl(nextProfileImageUrl ?? undefined);
      nextProfileImageUrl = null;
    } else if (updateSettingsDto.profileImageUrl) {
      const incomingUrl = updateSettingsDto.profileImageUrl;

      // draft 업로드 URL은 저장 전 최종 경로로 확정합니다.
      if (incomingUrl.includes('/draft/')) {
        nextProfileImageUrl = await this.uploadsService.finalizeAboutImage(incomingUrl);
        if (currentSettings.profileImageUrl) {
          await this.uploadsService.deleteObjectByUrl(currentSettings.profileImageUrl);
        }
      } else {
        nextProfileImageUrl = incomingUrl;
      }
    }

    if (nextProfileImageUrl !== currentSettings.profileImageUrl) {
      updates.push({
        key: 'profile_image_url' as SettingKey,
        value: nextProfileImageUrl ?? '',
      });
    }
  }
}
