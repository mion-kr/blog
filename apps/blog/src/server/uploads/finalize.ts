// draft 업로드를 확정 경로로 옮긴다(이관 전 uploads.service·content-image-finalizer). R2 binding에는 복사가 없어 get → put.
import { or, sql } from 'drizzle-orm';
import { schema, type Db } from '../db';
import { keyFromUrl, publicUrl } from './media';

export class InvalidUploadKeyError extends Error {
  constructor() {
    super('잘못된 업로드 객체 키입니다.');
  }
}

const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const withSlash = (base: string) => (base.endsWith('/') ? base : `${base}/`);

/** 본문에서 MEDIA_BASE_URL 아래 URL 중 prefix로 시작하는 키 집합(URL 끝은 공백·)·"·'·<·>) */
export function contentKeys(content: string, prefix: string, base: string): Set<string> {
  const matches = content?.match(new RegExp(`${escapeRegExp(withSlash(base))}[^\\s)"'<>]+`, 'g')) ?? [];
  const keys = new Set<string>();
  for (const url of matches) {
    const key = keyFromUrl(url, base);
    if (key?.startsWith(prefix)) keys.add(key);
  }
  return keys;
}

export class MediaMover {
  /** 이번 요청에서 새로 만든 객체(실패 시 보상 삭제 대상) */
  readonly copied: string[] = [];
  /** 성공 뒤 지울 draft 원본 */
  readonly drafts: string[] = [];

  constructor(private readonly bucket: R2Bucket, private readonly base: string) {}

  private async copy(source: string, destination: string) {
    const object = await this.bucket.get(source);
    if (!object) throw new Error('업로드 원본이 없습니다.');
    await this.bucket.put(destination, object.body, { httpMetadata: object.httpMetadata });
    this.copied.push(destination);
  }

  async finalizeCover(input: { draftUuid?: string | null; objectKey?: string | null; postId: string; current: string | null }): Promise<string | null> {
    const { draftUuid, objectKey, postId, current } = input;
    if (!draftUuid || !objectKey) return current;
    if (!objectKey.startsWith(`draft/${draftUuid}/`)) throw new InvalidUploadKeyError();
    const fileName = objectKey.split('/').pop();
    if (!fileName) throw new InvalidUploadKeyError();
    const destination = `posts/${postId}/thumbnail/${fileName}`;
    await this.copy(objectKey, destination);
    this.drafts.push(objectKey);
    return publicUrl(destination, this.base);
  }

  async finalizeContent(input: { draftUuid?: string | null; postId: string; content: string }): Promise<string> {
    const { draftUuid, postId } = input;
    let content = input.content;
    if (!draftUuid) return content;
    for (const source of contentKeys(content, `draft/${draftUuid}/content/`, this.base)) {
      const fileName = source.split('/').pop();
      if (!fileName) continue;
      const destination = `posts/${postId}/content/${fileName}`;
      await this.copy(source, destination);
      this.drafts.push(source);
      content = content.split(publicUrl(source, this.base)).join(publicUrl(destination, this.base));
    }
    return content;
  }

  async finalizeAbout(url: string): Promise<string> {
    const key = keyFromUrl(url, this.base);
    if (!key?.startsWith('draft/')) throw new InvalidUploadKeyError();
    const segments = key.slice('draft/'.length).split('/');
    const fileName = segments[segments.length - 1];
    if (segments.length < 3 || segments[1] !== 'about' || !fileName) throw new InvalidUploadKeyError();
    const destination = `about/${fileName}`;
    await this.copy(key, destination);
    this.drafts.push(key);
    return publicUrl(destination, this.base);
  }

  /** 실패 시 이번 요청에서 만든 객체만 지운다. */
  async rollback() {
    await this.deleteKeys(this.copied.splice(0));
  }

  async deleteKeys(keys: string[]) {
    for (const key of keys) {
      try {
        await this.bucket.delete(key);
      } catch (error) {
        console.warn('객체 삭제 실패', (error as Error).name);
      }
    }
  }

  /** 저장이 끝난 뒤 정리: 어느 글(커버·본문)이나 설정도 쓰지 않는 객체만 지운다(다른 글과 공유하는 이미지 보호). */
  async deleteUnused(db: Db, keys: (string | null | undefined)[]) {
    const { posts, settings } = schema;
    // 키를 부분 문자열(instr)로 찾는다. LIKE는 키의 _·%를 와일드카드로 읽는다. 넓게 걸리면 남기는 쪽이라 안전하다.
    // 확인이 실패하면 쓰는 것으로 보고 남긴다(정리는 저장 뒤 최선 노력이라 응답을 막지 않는다).
    const used = async (key: string) => {
      try {
        const [post, setting] = await Promise.all([
          db.select({ id: posts.id }).from(posts).where(or(sql`instr(${posts.content}, ${key}) > 0`, sql`instr(${posts.coverImage}, ${key}) > 0`)).limit(1).get(),
          db.select({ id: settings.id }).from(settings).where(sql`instr(${settings.value}, ${key}) > 0`).limit(1).get(),
        ]);
        return Boolean(post || setting);
      } catch (error) {
        console.warn('객체 참조 확인 실패', (error as Error).name);
        return true;
      }
    };
    const candidates = [...new Set(keys.filter((k): k is string => Boolean(k)))];
    const flags = await Promise.all(candidates.map(used));
    await this.deleteKeys(candidates.filter((_, i) => !flags[i]));
  }
}
