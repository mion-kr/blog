import type { APIRoute } from 'astro';
import { clearOauthCookie, finishGoogleLogin, oauthTokenFromRequest } from '../../../../server/auth/oauth';
import { createSessionCookie } from '../../../../server/auth/session';
import { upsertAdminUser } from '../../../../server/auth/users';
import { env, siteUrl } from '../../../../server/env';

// 이관 전 next-auth 콜백과 같은 경로(Google 콘솔 등록 주소 유지)
export const GET: APIRoute = async ({ request, url }) => {
  const base = siteUrl();
  const headers = new Headers({ 'Set-Cookie': clearOauthCookie(base) });
  const redirect = (location: string) => {
    headers.set('Location', location);
    return new Response(null, { status: 302, headers });
  };
  const config = { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, siteUrl: base, secret: env.SESSION_SECRET! };
  const result = await finishGoogleLogin(config, url, oauthTokenFromRequest(request, base));
  if (!result.ok) {
    console.warn('Google 로그인 실패', result.step);
    return redirect('/auth/signin?error=OAuthError');
  }
  if (result.identity.email !== env.ADMIN_EMAIL) return redirect('/auth/signin?error=AccessDenied');
  try {
    const user = await upsertAdminUser(result.identity);
    // 세션 이메일은 방금 ADMIN_EMAIL과 비교한 Google 이메일이다. 저장된 email은 대소문자가 다를 수 있어 쓰면 middleware에서 막혀 로그인이 반복된다.
    headers.append('Set-Cookie', await createSessionCookie({ sub: user.id, email: result.identity.email, name: user.name }, { secret: env.SESSION_SECRET!, siteUrl: base }));
    return redirect(result.callbackUrl);
  } catch (error) {
    console.error('관리자 사용자 저장 실패', (error as Error).name);
    return redirect('/auth/signin?error=OAuthError');
  }
};
