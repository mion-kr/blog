import { Injectable } from '@nestjs/common';
import { blogSettings, db } from '@repo/database';

import { SettingsResponseDto, UpdateSettingsDto } from './dto';
import { UploadsService } from '../uploads/uploads.service';

type SettingKey =
  | 'site_title'
  | 'site_description'
  | 'site_url'
  | 'posts_per_page'
  | 'profile_image_url';

const SETTINGS_KEY_MAP: Record<SettingKey, keyof SettingsResponseDto> = {
  site_title: 'siteTitle',
  site_description: 'siteDescription',
  site_url: 'siteUrl',
  posts_per_page: 'postsPerPage',
  profile_image_url: 'profileImageUrl',
};

const DEFAULT_SETTINGS: SettingsResponseDto = new SettingsResponseDto({
  siteTitle: "Mion's Blog",
  siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
  siteUrl: 'http://localhost:3000',
  postsPerPage: 10,
  profileImageUrl: null,
});

@Injectable()
export class SettingsService {
  constructor(private readonly uploadsService: UploadsService) {}

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
    const currentSettings = await this.findAll();

    const updates: Array<{ key: SettingKey; value: string }> = [];

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

    let nextProfileImageUrl = currentSettings.profileImageUrl ?? null;

    if (updateSettingsDto.profileImageRemove) {
      await this.uploadsService.deleteObjectByUrl(nextProfileImageUrl ?? undefined);
      nextProfileImageUrl = null;
      if (currentSettings.profileImageUrl) {
        updates.push({ key: 'profile_image_url', value: '' });
      }
    } else if (updateSettingsDto.profileImageUrl) {
      const incomingUrl = updateSettingsDto.profileImageUrl;
      if (incomingUrl.includes('/draft/')) {
        nextProfileImageUrl = await this.uploadsService.finalizeAboutImage(incomingUrl);
        if (currentSettings.profileImageUrl) {
          await this.uploadsService.deleteObjectByUrl(currentSettings.profileImageUrl);
        }
      } else {
        nextProfileImageUrl = incomingUrl;
      }

      if (nextProfileImageUrl !== currentSettings.profileImageUrl) {
        updates.push({ key: 'profile_image_url', value: nextProfileImageUrl ?? '' });
      }
    }

    if (updates.length === 0) {
      return currentSettings;
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
      profileImageUrl: this.normalizeOptionalString(
        normalized.get('profile_image_url') ?? undefined,
      ),
    });
  }

  private normalizeOptionalString(value?: string): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    return trimmed;
  }
}
