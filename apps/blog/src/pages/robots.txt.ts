import type { APIRoute } from 'astro';
import { buildRobots } from '../lib/seo-files';
import { env, siteUrl } from '../server/env';

export const GET: APIRoute = () =>
  new Response(buildRobots(siteUrl(), env.ROBOTS_INDEXABLE === 'true'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
