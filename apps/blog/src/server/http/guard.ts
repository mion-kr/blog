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
export const isWriteFrozen = (flag: string | undefined, method: string, path: string) => flag === 'true' && WRITE.has(method) && under(path, '/api/admin');

