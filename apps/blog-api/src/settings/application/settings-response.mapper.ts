import { PublicSettingsResponseDto, SettingsResponseDto } from '../dto';
import {
  SettingsRow,
  SettingKey,
  SETTINGS_KEY_MAP,
} from '../repositories/settings.repository';

/**
 * 기본 설정 응답 값입니다.
 */
export const DEFAULT_SETTINGS = new SettingsResponseDto({
  siteTitle: "Mion's Blog",
  siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
  siteUrl: 'http://localhost:3000',
  postsPerPage: 10,
  profileImageUrl: null,
});

/**
 * 설정 저장소 행을 응답 DTO로 변환합니다.
 */
export function mapSettingsRowsToResponse(rows: SettingsRow[]): SettingsResponseDto {
  const normalized = new Map<SettingKey, string>();

  // 알려진 키만 정규화해 응답 변환 계층에서 기본값 정책을 유지합니다.
  rows.forEach(({ key, value }) => {
    if (key in SETTINGS_KEY_MAP) {
      normalized.set(key, value);
    }
  });

  return new SettingsResponseDto({
    siteTitle: normalized.get('site_title') ?? DEFAULT_SETTINGS.siteTitle,
    siteDescription:
      normalized.get('site_description') ?? DEFAULT_SETTINGS.siteDescription,
    siteUrl: normalized.get('site_url') ?? DEFAULT_SETTINGS.siteUrl,
    postsPerPage:
      Number(normalized.get('posts_per_page')) ||
      DEFAULT_SETTINGS.postsPerPage,
    profileImageUrl: normalizeOptionalString(
      normalized.get('profile_image_url') ?? undefined,
    ),
  });
}

/**
 * 전체 설정 응답을 공개 설정 DTO로 축소합니다.
 */
export function mapSettingsToPublicResponse(
  settings: SettingsResponseDto,
): PublicSettingsResponseDto {
  return new PublicSettingsResponseDto({
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
    siteUrl: settings.siteUrl,
    profileImageUrl: settings.profileImageUrl ?? null,
  });
}

/**
 * 빈 문자열을 null로 정규화합니다.
 */
export function normalizeOptionalString(value?: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}
