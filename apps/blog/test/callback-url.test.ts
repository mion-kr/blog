import { describe, expect, it } from 'vitest';
import { getSafeCallbackUrl } from '../src/server/auth/callback-url';

describe('getSafeCallbackUrl(이관 전 lib/auth/callback-url.ts)', () => {
  it('안전한 내부 주소는 그대로', () => {
    for (const v of ['/admin', '/admin/posts?page=2', '/admin/posts/%ED%95%9C/edit']) expect(getSafeCallbackUrl(v)).toBe(v);
  });
  it('바깥·우회 주소는 /admin', () => {
    for (const v of ['https://evil.test', '//evil.test', '/\\evil.test', '/%2F%2Fevil.test', '/%252F%252Fevil.test', '/a\nb', '/%0d%0a', 'admin', '', '/%E0%A4%A']) {
      expect(getSafeCallbackUrl(v), v).toBe('/admin');
    }
    expect(getSafeCallbackUrl(undefined)).toBe('/admin');
    expect(getSafeCallbackUrl(null)).toBe('/admin');
  });
});
