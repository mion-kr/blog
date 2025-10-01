import type { ApiResponse, BlogSettings, UpdateBlogSettingsDto } from '@repo/shared';

import { ensureAuthToken, request } from './base-client';
import type { ApiRequestOptions } from './base-client';

export const settingsApi = {
  async getSettings(options: ApiRequestOptions): Promise<ApiResponse<BlogSettings>> {
    ensureAuthToken(options.token, 'GET /api/admin/settings');
    return request<BlogSettings>('/api/admin/settings', options);
  },

  async updateSettings(
    payload: UpdateBlogSettingsDto,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<BlogSettings>> {
    ensureAuthToken(options.token, 'PATCH /api/admin/settings');
    return request<BlogSettings>('/api/admin/settings', {
      ...options,
      method: 'PATCH',
      body: payload,
    });
  },
};
