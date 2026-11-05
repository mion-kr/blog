import type { APIRoute } from 'astro';
import { isUuidV7 } from '../../../lib/uuid';
import { env } from '../../../server/env';
import { fail, ok } from '../../../server/http/json';
import { publicUrl } from '../../../server/uploads/media';
import { buildObjectKey, parsePolicy, validateFile, type UploadType } from '../../../server/uploads/policy';

const TYPES: UploadType[] = ['thumbnail', 'content', 'about'];

// 관리자 이미지 업로드: 파일을 받아 R2 draft 경로에 저장한다(design.md D4).
export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, 'VALIDATION_FAILED', '입력 데이터가 올바르지 않습니다.');
  }
  const file = form.get('file');
  const type = form.get('type');
  const draftUuid = form.get('draftUuid');
  const fieldErrors: Record<string, string[]> = {};
  if (!(file instanceof File)) fieldErrors.file = ['파일이 필요합니다.'];
  if (!TYPES.includes(type as UploadType)) fieldErrors.type = ['type은 thumbnail, content, about 중 하나여야 합니다.'];
  if (!isUuidV7(draftUuid)) fieldErrors.draftUuid = ['draftUuid는 UUIDv7이어야 합니다.'];
  if (Object.keys(fieldErrors).length > 0 || !(file instanceof File)) return fail(400, 'VALIDATION_FAILED', '입력 데이터가 올바르지 않습니다.', fieldErrors);

  const problem = validateFile(parsePolicy(env), file.type, file.size);
  if (problem) return fail(400, problem.code, problem.message);

  const objectKey = buildObjectKey({ filename: file.name, mimeType: file.type, draftUuid: draftUuid as string, type: type as UploadType }, Date.now());
  try {
    await env.MEDIA.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  } catch (error) {
    console.error('업로드 저장 실패', (error as Error).name);
    return fail(500, 'STORAGE_ERROR', '이미지를 저장하지 못했어요.');
  }
  return ok({ objectKey, publicUrl: publicUrl(objectKey, env.MEDIA_BASE_URL) }, 201);
};
