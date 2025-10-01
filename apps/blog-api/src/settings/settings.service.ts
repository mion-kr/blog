import { Injectable } from '@nestjs/common';
import { blogSettings, db } from '@repo/database';

import { SettingsResponseDto, UpdateSettingsDto } from './dto';

type SettingKey =
  | 'site_title'
  | 'site_description'
  | 'site_url'
  | 'posts_per_page';

const SETTINGS_KEY_MAP: Record<SettingKey, keyof SettingsResponseDto> = {
  site_title: 'siteTitle',
  site_description: 'siteDescription',
  site_url: 'siteUrl',
  posts_per_page: 'postsPerPage',
};

const DEFAULT_SETTINGS: SettingsResponseDto = new SettingsResponseDto({
  siteTitle: "Mion's Blog",
  siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
  siteUrl: 'http://localhost:3000',
  postsPerPage: 10,
});

@Injectable()
export class SettingsService {
  async findAll(): Promise<SettingsResponseDto> {
    const rows = await db.select().from(blogSettings);
    return this.mapToResponse(
      rows.map((row) => ({ key: row.key, value: row.value })),
    );
  }

  async update(
    updateSettingsDto: UpdateSettingsDto,
    userId: string,
  ): Promise<SettingsResponseDto> {
    const updates = this.buildUpdatePayload(updateSettingsDto);

    if (updates.length === 0) {
      return this.findAll();
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      for (const { key, value } of updates) {
        await tx
          .insert(blogSettings)
          .values({
            key,
            value,
            updatedAt: now,
            updatedBy: userId,
          })
          .onConflictDoUpdate({
            target: blogSettings.key,
            set: {
              value,
              updatedAt: now,
              updatedBy: userId,
            },
          });
      }
    });

    return this.findAll();
  }

  private buildUpdatePayload(
    dto: UpdateSettingsDto,
  ): Array<{ key: SettingKey; value: string }> {
    const payload: Array<{ key: SettingKey; value: string }> = [];

    if (dto.siteTitle !== undefined) {
      payload.push({ key: 'site_title', value: dto.siteTitle });
    }

    if (dto.siteDescription !== undefined) {
      payload.push({ key: 'site_description', value: dto.siteDescription });
    }

    if (dto.siteUrl !== undefined) {
      payload.push({ key: 'site_url', value: dto.siteUrl });
    }

    if (dto.postsPerPage !== undefined) {
      payload.push({ key: 'posts_per_page', value: String(dto.postsPerPage) });
    }

    return payload;
  }

  private mapToResponse(
    rows: Array<{ key: string; value: string }>,
  ): SettingsResponseDto {
    const normalized = new Map<SettingKey, string>();

    rows.forEach(({ key, value }) => {
      if ((key as SettingKey) in SETTINGS_KEY_MAP) {
        normalized.set(key as SettingKey, value);
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
    });
  }
}
