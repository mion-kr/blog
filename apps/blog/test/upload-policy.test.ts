import { describe, expect, it } from 'vitest';
import { buildObjectKey, parsePolicy, validateFile } from '../src/server/uploads/policy';

// 이관 전 upload-policy.service.spec.ts + 이름 정규화 실측(설계 문서)
describe('업로드 정책', () => {
  const policy = parsePolicy({ UPLOAD_ALLOWED_MIME: 'image/png,image/jpeg', UPLOAD_MAX_SIZE: '10485760' });

  it('정규화한 draft 키', () => {
    expect(buildObjectKey({ filename: 'Profile Image.PNG', mimeType: 'image/png', draftUuid: 'draft-uuid', type: 'about' }, 1_700_000_000_000)).toBe('draft/draft-uuid/about/1700000000000-profile-image.png');
  });

  it('이름 정규화 실측값', () => {
    const key = (filename: string, mimeType = 'image/png') => buildObjectKey({ filename, mimeType, draftUuid: 'd', type: 'content' }, 1);
    expect(key('한글 사진.png')).toBe('draft/d/content/1-image.png');
    expect(key('café_photo.jpg')).toBe('draft/d/content/1-cafe-photo.jpg');
    expect(key('a..b.webp')).toBe('draft/d/content/1-ab.webp');
    expect(key('noext', 'image/webp')).toBe('draft/d/content/1-noext.webp');
    expect(key('noext', 'image/gif')).toBe('draft/d/content/1-noext');
  });

  it('허용 밖 MIME 거부, 목록이 비면 모두 허용', () => {
    expect(validateFile(parsePolicy({ UPLOAD_ALLOWED_MIME: 'image/jpeg' }), 'image/png', 1)).toEqual({ code: 'UPLOAD_MIME_NOT_ALLOWED', message: '지원하지 않는 파일 형식이에요. (image/jpeg)' });
    expect(validateFile(parsePolicy({ UPLOAD_ALLOWED_MIME: '' }), 'text/html', 1)).toBeNull();
    expect(validateFile(policy, 'image/png', 1024)).toBeNull();
  });

  it('최대 크기 초과 거부(기본 10MB, 잘못된 값이면 기본값)', () => {
    expect(validateFile(policy, 'image/png', 20 * 1024 * 1024)).toEqual({ code: 'UPLOAD_TOO_LARGE', message: '파일 용량이 너무 커요. 최대 10.0MB까지 업로드할 수 있어요.' });
    expect(parsePolicy({ UPLOAD_MAX_SIZE: 'abc' }).maxFileSize).toBe(10 * 1024 * 1024);
    expect(parsePolicy({ UPLOAD_MAX_SIZE: '0' }).maxFileSize).toBe(10 * 1024 * 1024);
  });
});
