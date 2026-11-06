import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { viewPublishedPost } from '../src/server/posts/public';
import { clearTables } from './helpers/db';
import { seedBasic } from './helpers/seed';

// 새 글 발행 직후 복제본이 primary보다 늦으면 상세가 404가 된다. 상세는 primary로 읽는다.
describe('viewPublishedPost 읽기 경로', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
  });
  afterEach(() => vi.restoreAllMocks());

  it('읽기 복제본 세션(withSession)을 쓰지 않는다', async () => {
    const withSession = vi.spyOn(env.DB, 'withSession');
    const viewed = await viewPublishedPost('first-post');
    expect(viewed?.post.slug).toBe('first-post');
    expect(withSession).not.toHaveBeenCalled();
  });
});
