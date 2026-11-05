import { defineMiddleware } from 'astro:middleware';
import { readSession, sessionTokenFromRequest } from './server/auth/session';
import { env, siteUrl } from './server/env';
import { fail } from './server/http/json';
import { isWriteFrozen, normalizePath, under, WRITE } from './server/http/guard';

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals } = context;
  const base = siteUrl();
  const path = normalizePath(url.pathname);
  if (path === null) return new Response('Bad Request', { status: 400 });
  const adminPage = under(path, '/admin');
  const adminApi = under(path, '/api/admin');

  // 관리자 확인: 매 요청 쿠키 복호화 + ADMIN_EMAIL 정확 일치(DB 조회 없음)
  const token = sessionTokenFromRequest(request, base);
  const result = token && env.SESSION_SECRET ? await readSession(token, { secret: env.SESSION_SECRET }) : ({ ok: false, reason: 'invalid' } as const);
  const isAdmin = result.ok && Boolean(env.ADMIN_EMAIL) && result.session.email === env.ADMIN_EMAIL;
  if (isAdmin && result.ok) locals.viewer = { id: result.session.sub, email: result.session.email, name: result.session.name, exp: result.session.exp };

  if ((adminPage || adminApi) && !isAdmin) {
    if (adminApi) return fail(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    const target = new URLSearchParams({ callbackUrl: url.pathname + url.search });
    if (!result.ok && result.reason === 'expired') target.set('error', 'SessionExpired');
    return new Response(null, { status: 307, headers: { Location: `/auth/signin?${target.toString()}` } });
  }

  // 출처 검사: 관리자 쓰기와 로그아웃은 Origin이 사이트 주소와 같아야 한다(없으면 거부).
  if (WRITE.has(request.method) && (adminPage || adminApi || path === '/auth/signout')) {
    if (request.headers.get('origin') !== new URL(base).origin) return fail(403, 'ORIGIN_MISMATCH', '요청 출처가 올바르지 않아요.');
  }

  if (isWriteFrozen(env.ADMIN_WRITES_FROZEN, request.method, path)) return fail(423, 'EDIT_FROZEN', '전환 기간이라 편집이 잠겨 있어요.');

  return next();
});
