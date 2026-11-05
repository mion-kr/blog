// draft 업로드를 확정 경로로 옮긴다(이관 전 uploads.service·content-image-finalizer). R2 binding에는 복사가 없어 get → put.
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

  async deleteUrls(urls: (string | null | undefined)[]) {
    await this.deleteKeys(urls.map((u) => keyFromUrl(u, this.base)).filter((k): k is string => Boolean(k)));
  }
}
