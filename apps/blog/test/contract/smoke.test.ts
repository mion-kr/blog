import { exports } from 'cloudflare:workers';
import { expect, it } from 'vitest';

it('Astro Worker가 workerd에서 응답한다', async () => {
  const res = await exports.default.fetch('http://localhost:4321/');
  expect(res.status).toBe(200);
  expect(await res.text()).toContain('mion blog');
});
