import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../server/auth/session';
import { siteUrl } from '../../server/env';

// 출처 검사는 middleware가 한다.
export const POST: APIRoute = () =>
  new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': clearSessionCookie(siteUrl()) } });
