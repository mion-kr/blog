import type { APIRoute } from 'astro';
import { env } from '../../server/env';

// 로컬 개발 전용: 로컬 R2에 올린 이미지를 보여 준다. 미리보기·운영은 media.mion-space.dev가 맡는다.
export const GET: APIRoute = async ({ params }) => {
  if (env.SERVE_MEDIA_FROM_BINDING !== 'true' || !params.key) return new Response('Not Found', { status: 404 });
  const object = await env.MEDIA.get(params.key);
  if (!object) return new Response('Not Found', { status: 404 });
  return new Response(object.body, { headers: { 'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream' } });
};
