import type { SettingsResponseDto } from '../dto';

/**
 * 설정 저장소에서 관리하는 키 집합입니다.
 */
export type SettingKey =
  | 'site_title'
  | 'site_description'
  | 'site_url'
  | 'posts_per_page'
  | 'profile_image_url';

/**
 * 설정 저장소 행의 최소 표현입니다.
 */
export interface SettingsRow {
  key: SettingKey;
  value: string;
}

/**
 * 설정 변경 저장 요청의 최소 표현입니다.
 */
export interface SettingsUpsertEntry {
  key: SettingKey;
  value: string;
}

/**
 * 설정 저장소 계약입니다.
 */
export interface SettingsRepository {
  /**
   * 저장된 모든 설정 키/값을 조회합니다.
   */
  findAll(): Promise<SettingsRow[]>;

  /**
   * 변경된 설정 키/값을 저장합니다.
   */
  upsertMany(entries: SettingsUpsertEntry[], userId: string): Promise<void>;
}

/**
 * 설정 저장소 DI 토큰입니다.
 */
export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY');

/**
 * 설정 DTO 속성과 설정 키 간 매핑입니다.
 */
export const SETTINGS_KEY_MAP: Record<SettingKey, keyof SettingsResponseDto> = {
  site_title: 'siteTitle',
  site_description: 'siteDescription',
  site_url: 'siteUrl',
  posts_per_page: 'postsPerPage',
  profile_image_url: 'profileImageUrl',
};
