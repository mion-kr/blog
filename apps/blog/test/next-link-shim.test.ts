import { describe, expect, it } from 'vitest';
import { toHref } from '../src/shims/next-link';

describe('next/link shim', () => {
  it('{ pathname, query } 형태를 주소로 바꾸고 빈 값은 뺀다', () => {
    expect(toHref({ pathname: '/admin/posts', query: { page: 2, search: undefined, published: 'true' } })).toBe('/admin/posts?page=2&published=true');
    expect(toHref('/a')).toBe('/a');
  });
});
