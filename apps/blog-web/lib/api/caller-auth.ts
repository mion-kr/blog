import 'server-only';

import { getVercelOidcToken } from '@vercel/oidc';

import { ApiError } from '../api-errors';

export async function getCallerHeaders(): Promise<Record<string, string>> {
  if (process.env.VERCEL !== undefined) {
    try {
      const token = await getVercelOidcToken();
      if (token) return { 'X-Mion-Caller-OIDC': token };
    } catch {
      // SDK 오류에 토큰이나 배포 설정이 포함될 수 있어 외부로 전달하지 않습니다.
    }
  } else if (
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
    process.env.BLOG_API_LOCAL_SECRET?.trim()
  ) {
    return { 'X-Mion-Local-Caller': process.env.BLOG_API_LOCAL_SECRET };
  }

  throw new ApiError(503, 'CALLER_AUTH_UNAVAILABLE', '서버 연결 인증을 준비하지 못했습니다.');
}

export function resolveBackendUrl(endpoint: string): string {
  if (!/^\/api\//.test(endpoint) || /[\\\r\n]/.test(endpoint)) {
    throw new ApiError(400, 'INVALID_API_PATH', '허용하지 않는 API 경로입니다.');
  }
  const base = process.env.BLOG_API_URL;
  if (!base) {
    throw new ApiError(503, 'API_UNAVAILABLE', '서버 연결 설정을 준비하지 못했습니다.');
  }
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new ApiError(503, 'API_UNAVAILABLE', '서버 연결 설정이 올바르지 않습니다.');
  }
  const localDevelopment = process.env.VERCEL === undefined &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
  if (url.username || url.password ||
    (url.protocol !== 'https:' && !(localDevelopment && url.protocol === 'http:'))) {
    throw new ApiError(503, 'API_UNAVAILABLE', '서버 연결 설정이 올바르지 않습니다.');
  }
  const target = new URL(endpoint, url.origin);
  if (!target.pathname.startsWith('/api/')) {
    throw new ApiError(400, 'INVALID_API_PATH', '허용하지 않는 API 경로입니다.');
  }
  return target.toString();
}
