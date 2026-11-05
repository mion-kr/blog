import type { APIRoute } from 'astro';
import { startGoogleLogin } from '../../server/auth/oauth';
import { env, siteUrl } from '../../server/env';

export const GET: APIRoute = async ({ url }) => {
  const { location, setCookie } = await startGoogleLogin(
    { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, siteUrl: siteUrl(), secret: env.SESSION_SECRET! },
    url.searchParams.get('callbackUrl'),
  );
  return new Response(null, { status: 302, headers: { Location: location, 'Set-Cookie': setCookie } });
};
