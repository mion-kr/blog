// middleware가 쓰는 판정 함수(테스트에서 직접 부를 수 있게 분리)
export const WRITE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** 디코드·소문자·중복 슬래시 정리. 디코드 실패는 null(거부). */
export function normalizePath(pathname: string): string | null {
  try {
    return decodeURIComponent(pathname).toLowerCase().replace(/\/{2,}/g, '/');
  } catch {
    return null;
  }
}

export const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** 전환 뒤 관찰 기간의 관리자 편집 동결(사용자 결정 7): /api/admin/* 쓰기만 */
export const isWriteFrozen = (flag: string | undefined, method: string, path: string) => flag === 'true' && WRITE.has(method.toUpperCase()) && under(path, '/api/admin');

// 사용자 결정 17: 모든 동적 응답에 붙이는 보안 헤더. 클릭재킹 방지(frame-ancestors·X-Frame-Options)가 우선이다.
// script-src·style-src는 넣지 않는다(island·JSON-LD 인라인 스크립트와 style 속성을 쓴다).
export const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/** Response.redirect() 등은 헤더가 잠겨 있어 복사본에 붙인다. */
export function withSecurityHeaders(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}
