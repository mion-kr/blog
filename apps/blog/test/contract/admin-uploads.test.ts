import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { adminCookie } from '../helpers/auth';
import { fetchPage } from '../helpers/seed';

const DRAFT = '01900000-0000-7000-8000-00000000abcd';
const png = (bytes = 10, name = 'Profile Image.PNG', type = 'image/png') => new File([new Uint8Array(bytes)], name, { type });

async function upload(fields: Record<string, string | File>, headers?: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return fetchPage('/api/admin/uploads', { method: 'POST', body: form, headers: headers ?? { cookie: await adminCookie(), origin: 'http://localhost:4321' } });
}

describe('POST /api/admin/uploads', () => {
  for (const type of ['thumbnail', 'content', 'about']) {
    it(`${type}: 201, draft 키, 공개 URL, R2에 contentType과 함께 저장`, async () => {
      const res = await upload({ file: png(), type, draftUuid: DRAFT });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { success: boolean; data: { objectKey: string; publicUrl: string } };
      expect(body.success).toBe(true);
      expect(body.data.objectKey).toMatch(new RegExp(`^draft/${DRAFT}/${type}/\\d{13}-profile-image\\.png$`));
      expect(body.data.publicUrl).toBe(`http://localhost:4321/local-media/${body.data.objectKey}`);
      const object = await env.MEDIA.get(body.data.objectKey);
      expect(object?.httpMetadata?.contentType).toBe('image/png');
      expect((await object!.arrayBuffer()).byteLength).toBe(10);
    });
  }

  it('한글 파일명은 image로', async () => {
    const res = await upload({ file: png(5, '한글 사진.png'), type: 'content', draftUuid: DRAFT });
    expect(((await res.json()) as { data: { objectKey: string } }).data.objectKey).toMatch(/-image\.png$/);
  });

  it('허용 밖 MIME 400', async () => {
    const res = await upload({ file: png(5, 'a.html', 'text/html'), type: 'content', draftUuid: DRAFT });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UPLOAD_MIME_NOT_ALLOWED');
  });

  it('실제 바이트가 UPLOAD_MAX_SIZE(10MB)를 넘으면 400', async () => {
    const res = await upload({ file: png(10 * 1024 * 1024 + 1), type: 'content', draftUuid: DRAFT });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('UPLOAD_TOO_LARGE');
  });

  it('file·type·draftUuid 누락·형식 오류는 400 VALIDATION_FAILED, R2 쓰기 없음', async () => {
    const before = (await env.MEDIA.list()).objects.length;
    for (const fields of [
      { type: 'content', draftUuid: DRAFT },
      { file: png(), draftUuid: DRAFT },
      { file: png(), type: 'avatar', draftUuid: DRAFT },
      { file: png(), type: 'content' },
      { file: png(), type: 'content', draftUuid: 'not-a-uuid' },
      { file: 'text', type: 'content', draftUuid: DRAFT },
    ] as Record<string, string | File>[]) {
      const res = await upload(fields);
      expect(res.status, JSON.stringify(Object.keys(fields))).toBe(400);
      expect(((await res.json()) as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
    }
    expect((await env.MEDIA.list()).objects.length).toBe(before);
  });

  it('미인증 401, 다른 출처 403', async () => {
    expect((await upload({ file: png(), type: 'content', draftUuid: DRAFT }, { origin: 'http://localhost:4321' })).status).toBe(401);
    expect((await upload({ file: png(), type: 'content', draftUuid: DRAFT }, { cookie: await adminCookie(), origin: 'https://evil.test' })).status).toBe(403);
  });
});

describe('GET /local-media/{key}(로컬 전용)', () => {
  it('SERVE_MEDIA_FROM_BINDING=true면 R2 객체를 contentType과 함께 돌려준다', async () => {
    await env.MEDIA.put('posts/p1/thumbnail/a.webp', new Uint8Array([1, 2, 3]), { httpMetadata: { contentType: 'image/webp' } });
    const res = await fetchPage('/local-media/posts/p1/thumbnail/a.webp');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/webp');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await fetchPage('/local-media/nope.png')).status).toBe(404);
  });
});
