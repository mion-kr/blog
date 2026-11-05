import { describe, expect, it } from 'vitest';
import { isWriteFrozen } from '../../src/server/http/guard';

// 테스트 환경 vars는 ADMIN_WRITES_FROZEN=false라 HTTP로는 판정 함수만 확인하고, 동결 응답은 각 쓰기 계약 파일에서 확인하지 않는다.
describe('편집 동결 판정', () => {
  it('ADMIN_WRITES_FROZEN=true일 때 /api/admin/* 쓰기만 동결', () => {
    expect(isWriteFrozen('true', 'POST', '/api/admin/posts')).toBe(true);
    expect(isWriteFrozen('true', 'DELETE', '/api/admin/tags/x')).toBe(true);
    expect(isWriteFrozen('true', 'GET', '/api/admin/posts')).toBe(false);
    expect(isWriteFrozen('true', 'POST', '/auth/signout')).toBe(false);
    expect(isWriteFrozen('true', 'GET', '/posts/a')).toBe(false);
    expect(isWriteFrozen('false', 'POST', '/api/admin/posts')).toBe(false);
    expect(isWriteFrozen(undefined, 'POST', '/api/admin/posts')).toBe(false);
  });
});
