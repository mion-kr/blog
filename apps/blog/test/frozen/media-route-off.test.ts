import { env } from 'cloudflare:workers';
import { expect, it } from 'vitest';
import { fetchPage } from '../helpers/seed';

// frozen 프로젝트는 SERVE_MEDIA_FROM_BINDING=false로 둔다(운영과 같은 값).
it('SERVE_MEDIA_FROM_BINDING=false면 /local-media는 404', async () => {
  await env.MEDIA.put('a.png', new Uint8Array([1]));
  expect((await fetchPage('/local-media/a.png')).status).toBe(404);
});
