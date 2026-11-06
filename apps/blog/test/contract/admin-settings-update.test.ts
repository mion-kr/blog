import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { adminJson } from '../helpers/admin-api';
import { clearTables } from '../helpers/db';
import { ids, seedBasic } from '../helpers/seed';

const BASE = 'http://localhost:4321/local-media/';
const D = '01900000-0000-7000-8000-00000000d003';
const patch = (body: unknown, headers?: Record<string, string>) => adminJson('PATCH', '/api/admin/settings', body, headers);
const rows = () => env.DB.prepare('SELECT key, value, updated_by FROM settings ORDER BY key').all().then((r) => r.results);
const put = (key: string) => env.MEDIA.put(key, new Uint8Array([1]), { httpMetadata: { contentType: 'image/png' } });
const exists = async (key: string) => (await env.MEDIA.head(key)) !== null;
const DEFAULTS = { siteTitle: "Mion's Blog", siteDescription: '개발과 기술에 관한 이야기를 나눕니다.', siteUrl: 'http://localhost:3000', postsPerPage: 10, profileImageUrl: null };

describe('PATCH /api/admin/settings', () => {
  beforeEach(async () => {
    await clearTables();
    await seedBasic();
    const listed = await env.MEDIA.list();
    await Promise.all(listed.objects.map((o) => env.MEDIA.delete(o.key)));
  });

  it('행이 없으면 기본값, 바뀐 값이 없으면 쓰지 않는다', async () => {
    const { status, body } = await patch({});
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, data: DEFAULTS });
    expect(await rows()).toEqual([]);
    await patch({ siteTitle: "Mion's Blog", postsPerPage: 10 });
    expect(await rows()).toEqual([]);
  });

  it('바뀐 필드만 key 단위로 저장, updated_by = 세션 사용자, 응답은 설정 5필드', async () => {
    const { body } = await patch({ siteTitle: '새 제목', postsPerPage: 20 });
    expect(body!.data).toEqual({ ...DEFAULTS, siteTitle: '새 제목', postsPerPage: 20 });
    expect(await rows()).toEqual([
      { key: 'posts_per_page', value: '20', updated_by: ids.user },
      { key: 'site_title', value: '새 제목', updated_by: ids.user },
    ]);
    await patch({ siteTitle: '또 바뀐 제목' });
    expect((await rows()).find((r) => r.key === 'site_title')!.value).toBe('또 바뀐 제목');
  });

  it('검증: 길이·범위·정수·최상위 도메인 없는 URL은 400 + 칸별 오류(사용자 결정 2)', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ siteTitle: '' }, 'siteTitle'], [{ siteTitle: 'a'.repeat(61) }, 'siteTitle'], [{ siteDescription: 'a'.repeat(161) }, 'siteDescription'],
      [{ siteUrl: 'http://localhost:3000' }, 'siteUrl'], [{ siteUrl: 'ftp://a.dev' }, 'siteUrl'], [{ postsPerPage: 4 }, 'postsPerPage'],
      [{ postsPerPage: 51 }, 'postsPerPage'], [{ postsPerPage: 5.5 }, 'postsPerPage'], [{ profileImageUrl: 'x' }, 'profileImageUrl'], [{ profileImageRemove: 'yes' }, 'profileImageRemove'],
    ];
    for (const [body, field] of cases) {
      const res = await patch(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body!.error!.code).toBe('VALIDATION_FAILED');
      expect(res.body!.fieldErrors![field]!.length).toBeGreaterThan(0);
    }
    expect((await patch({ postsPerPage: 4 })).body!.fieldErrors!.postsPerPage).toEqual(['페이지당 포스트 수는 최소 5개 이상이어야 해요.']);
    expect(await rows()).toEqual([]);
  });

  it('소개 이미지: draft를 about/으로 확정하고 저장 뒤 이전 객체 삭제', async () => {
    await put('about/old.png');
    await env.DB.prepare("INSERT INTO settings (id,key,value,updated_at) VALUES ('s1','profile_image_url',?,0)").bind(`${BASE}about/old.png`).run();
    await put(`draft/${D}/about/1-me.png`);
    const { body } = await patch({ profileImageUrl: `${BASE}draft/${D}/about/1-me.png` });
    expect(body!.data.profileImageUrl).toBe(`${BASE}about/1-me.png`);
    expect(await exists('about/1-me.png')).toBe(true);
    expect(await exists(`draft/${D}/about/1-me.png`)).toBe(false);
    expect(await exists('about/old.png')).toBe(false);
  });

  it('소개 이미지 제거: 빈 값 저장 후 객체 삭제', async () => {
    await put('about/old.png');
    await env.DB.prepare("INSERT INTO settings (id,key,value,updated_at) VALUES ('s1','profile_image_url',?,0)").bind(`${BASE}about/old.png`).run();
    const { body } = await patch({ profileImageRemove: true });
    expect(body!.data.profileImageUrl).toBeNull();
    expect((await rows())[0]).toMatchObject({ key: 'profile_image_url', value: '' });
    expect(await exists('about/old.png')).toBe(false);
  });

  it('외부 URL은 그대로 저장, /draft/가 든 형식 오류 URL은 400 INVALID_UPLOAD_KEY', async () => {
    expect((await patch({ profileImageUrl: 'https://example.com/me.png' })).body!.data.profileImageUrl).toBe('https://example.com/me.png');
    const bad = await patch({ profileImageUrl: 'https://evil.test/draft/x/about/a.png' });
    expect(bad.status).toBe(400);
    expect(bad.body!.error!.code).toBe('INVALID_UPLOAD_KEY');
  });

  it('미인증 401, 다른 출처 403', async () => {
    expect((await patch({}, { origin: 'http://localhost:4321', 'content-type': 'application/json' })).status).toBe(401);
    expect((await patch({}, { cookie: await adminCookie(), origin: 'https://evil.test', 'content-type': 'application/json' })).status).toBe(403);
  });
});
