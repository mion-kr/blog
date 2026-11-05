// 이관 전 upload-image.ts와 같은 함수 이름·검사. pre-signed URL 대신 관리자 업로드 API에 파일을 바로 보낸다.
import type { PreSignedUploadRequestDto } from '@repo/shared';
import { adminFetch, errorMessage } from '@/lib/admin/client-actions';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function formatUploadFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function validateUploadableImage(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) return '지원하지 않는 파일 형식입니다. JPEG, PNG, WEBP만 업로드할 수 있어요.';
  if (file.size > MAX_IMAGE_FILE_SIZE) return `파일 용량이 너무 커요. 최대 ${formatUploadFileSize(MAX_IMAGE_FILE_SIZE)}까지 가능합니다.`;
  return null;
}

export async function uploadImageFromBrowser(payload: PreSignedUploadRequestDto, file: File): Promise<{ objectKey: string; publicUrl: string }> {
  const form = new FormData();
  form.set('file', file);
  form.set('type', payload.type);
  form.set('draftUuid', payload.draftUuid);
  const result = await adminFetch('POST', '/api/admin/uploads', form, window.location.pathname + window.location.search);
  if (!result.ok || !result.body?.data) throw new Error(errorMessage(result, '이미지를 업로드하지 못했어요.'));
  return result.body.data as { objectKey: string; publicUrl: string };
}
