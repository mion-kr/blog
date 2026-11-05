import type { APIRoute } from 'astro';
import { fail, ok } from '../../../server/http/json';
import { readJson } from '../../../server/http/validate';
import { SettingsError, updateSettings, updateSettingsSchema } from '../../../server/settings/update';

export const PATCH: APIRoute = async ({ request, locals }) => {
  const parsed = await readJson(request, updateSettingsSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return ok(await updateSettings(parsed.data, locals.viewer!.id));
  } catch (error) {
    if (error instanceof SettingsError) return fail(error.status, error.code, error.message);
    console.error('설정 저장 실패', (error as Error).name);
    return fail(500, 'INTERNAL_ERROR', '설정 저장 중 오류가 발생했어요.');
  }
};
