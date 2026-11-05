// 이관 전 upload-policy.service.ts 이식
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

export type UploadType = 'thumbnail' | 'content' | 'about';
export type UploadPolicy = { allowedMimeTypes: Set<string>; maxFileSize: number };

export function parsePolicy(vars: { UPLOAD_ALLOWED_MIME?: string; UPLOAD_MAX_SIZE?: string }): UploadPolicy {
  const allowedMimeTypes = new Set((vars.UPLOAD_ALLOWED_MIME ?? '').split(',').map((v) => v.trim()).filter(Boolean));
  const configured = Number(vars.UPLOAD_MAX_SIZE ?? DEFAULT_MAX_SIZE);
  return { allowedMimeTypes, maxFileSize: Number.isNaN(configured) || configured <= 0 ? DEFAULT_MAX_SIZE : configured };
}

export function validateFile(policy: UploadPolicy, mimeType: string, size: number): { code: string; message: string } | null {
  if (policy.allowedMimeTypes.size > 0 && !policy.allowedMimeTypes.has(mimeType)) {
    return { code: 'UPLOAD_MIME_NOT_ALLOWED', message: `지원하지 않는 파일 형식이에요. (${[...policy.allowedMimeTypes].join(', ')})` };
  }
  if (size > policy.maxFileSize) {
    return { code: 'UPLOAD_TOO_LARGE', message: `파일 용량이 너무 커요. 최대 ${(policy.maxFileSize / (1024 * 1024)).toFixed(1)}MB까지 업로드할 수 있어요.` };
  }
  return null;
}

/** node:path extname과 같은 규칙(앞의 점만 있는 이름은 확장자 없음) */
function extname(filename: string): string {
  const base = filename.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i) : '';
}

function sanitizeBaseName(filename: string): string {
  const normalized = filename
    .replace(/\.[^/.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return normalized || 'image';
}

function resolveExtension(filename: string, mimeType: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext) return ext;
  return ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' } as Record<string, string>)[mimeType] ?? '';
}

export function buildObjectKey(input: { filename: string; mimeType: string; draftUuid: string; type: UploadType }, timestamp: number): string {
  return `draft/${input.draftUuid}/${input.type}/${timestamp}-${sanitizeBaseName(input.filename)}${resolveExtension(input.filename, input.mimeType)}`;
}
