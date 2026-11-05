import { getDb, schema } from '../db';

export type BlogSettingsView = { siteTitle: string; siteDescription: string; siteUrl: string; postsPerPage: number; profileImageUrl: string | null };

export const SETTINGS_KEYS = { siteTitle: 'site_title', siteDescription: 'site_description', siteUrl: 'site_url', postsPerPage: 'posts_per_page', profileImageUrl: 'profile_image_url' } as const;

// 이관 전 settings-response.mapper.ts의 기본값
export const DEFAULT_SETTINGS: BlogSettingsView = { siteTitle: "Mion's Blog", siteDescription: '개발과 기술에 관한 이야기를 나눕니다.', siteUrl: 'http://localhost:3000', postsPerPage: 10, profileImageUrl: null };

export function mapSettingsRows(rows: { key: string; value: string }[]): BlogSettingsView {
  const m = new Map(rows.map((r) => [r.key, r.value]));
  const image = m.get('profile_image_url')?.trim();
  return {
    siteTitle: m.get('site_title') ?? DEFAULT_SETTINGS.siteTitle,
    siteDescription: m.get('site_description') ?? DEFAULT_SETTINGS.siteDescription,
    siteUrl: m.get('site_url') ?? DEFAULT_SETTINGS.siteUrl,
    postsPerPage: Number(m.get('posts_per_page')) || DEFAULT_SETTINGS.postsPerPage,
    profileImageUrl: image ? image : null,
  };
}

export async function getSettings(): Promise<BlogSettingsView> {
  return mapSettingsRows(await getDb().select({ key: schema.settings.key, value: schema.settings.value }).from(schema.settings));
}
