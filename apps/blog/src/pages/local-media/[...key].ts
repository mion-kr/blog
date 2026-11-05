import type { APIRoute } from 'astro';
import { env } from '../../server/env';

// 로컬과 workers.dev 미리보기에서 R2 이미지를 앱이 내려 준다(사용자 결정 11). 운영은 media.mion-space.dev가 맡고 이 경로는 404다.
export const GET: APIRoute = async ({ params }) => {
  if (env.SERVE_MEDIA_FROM_BINDING !== 'true' || !params.key) return new Response('Not Found', { status: 404 });
  const object = await env.MEDIA.get(params.key);
  if (!object) return new Response('Not Found', { status: 404 });
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' } });
};
