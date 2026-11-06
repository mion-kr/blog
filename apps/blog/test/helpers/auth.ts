import { createSessionCookie } from '../../src/server/auth/session';

export const TEST_SECRET = 'test-session-secret-0123456789abcdef';
export const ADMIN_EMAIL = 'admin@example.com';
export const ORIGIN = 'http://localhost:4321';

/** 테스트 환경(SITE_URL=http://localhost:4321)의 세션 쿠키 → Cookie 헤더 값 */
export async function adminCookie(opts: { email?: string; secret?: string; now?: Date; sub?: string } = {}) {
  const header = await createSessionCookie(
    { sub: opts.sub ?? '01900000-0000-7000-8000-000000000001', email: opts.email ?? ADMIN_EMAIL, name: '미온' },
    { secret: opts.secret ?? TEST_SECRET, siteUrl: ORIGIN, now: opts.now },
  );
  return header.split(';')[0]!;
}

export const adminHeaders = async (extra: Record<string, string> = {}) => ({ cookie: await adminCookie(), origin: ORIGIN, ...extra });
