// 이관 전 lib/admin/settings-actions.ts와 같은 함수 이름·반환. 검증 실패면 칸별 오류(fieldErrors)를 그대로 넘긴다(사용자 결정 2).
import type { SettingsActionState } from './settings-types';
import { adminFetch, errorMessage } from './client-actions';

const RETURN_TO = '/admin/settings';
const str = (v: FormDataEntryValue | null) => (v === null ? undefined : String(v).trim() || undefined);

async function updateAdminSettings(payload: Record<string, unknown>): Promise<SettingsActionState> {
  const result = await adminFetch('PATCH', '/api/admin/settings', payload, RETURN_TO);
  if (result.ok && result.body?.data) return { success: true, message: '설정이 업데이트되었습니다.', updatedSettings: result.body.data };
  return { success: false, error: errorMessage(result, '설정 저장에 실패했어요.'), fieldErrors: result.body?.fieldErrors };
}

export async function updateAdminBlogInfoAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const payload: Record<string, unknown> = { siteTitle: str(formData.get('siteTitle')), siteDescription: str(formData.get('siteDescription')), siteUrl: str(formData.get('siteUrl')) };
  if (String(formData.get('profileImageRemove') ?? '').trim().toLowerCase() === 'true') payload.profileImageRemove = true;
  else {
    const url = str(formData.get('profileImageUrl'));
    if (url !== undefined) payload.profileImageUrl = url;
  }
  return updateAdminSettings(payload);
}

export async function updateAdminPostSettingsAction(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const raw = str(formData.get('postsPerPage'));
  return updateAdminSettings({ postsPerPage: raw ? Number(raw) : undefined });
}
