// 이관 전 settings.service update: 바뀐 필드만 key 단위 upsert, 소개 이미지는 draft 확정. 이전 객체는 저장 성공 뒤 지운다.
import { z } from 'astro/zod';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getDb, schema } from '../db';
import { env } from '../env';
import { InvalidUploadKeyError, MediaMover } from '../uploads/finalize';
import { getSettings, SETTINGS_KEYS, type BlogSettingsView } from './read';

// validator.js isURL 기본값처럼 http(s)이고 최상위 도메인이 있어야 한다.
function isUrlWithTld(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const labels = url.hostname.split('.');
    return labels.length >= 2 && /^[a-z¡-￿]{2,}$/i.test(labels[labels.length - 1]!);
  } catch {
    return false;
  }
}
const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    // 로컬 개발의 업로드 주소(http://localhost:4321/local-media/…)만 최상위 도메인 예외
    return (u.protocol === 'http:' || u.protocol === 'https:') && (isUrlWithTld(v) || u.hostname === 'localhost');
  } catch {
    return false;
  }
};

export const updateSettingsSchema = z.object({
  siteTitle: z.string({ message: '사이트 제목은 문자열로 입력해주세요.' }).min(1, '사이트 제목은 1자 이상 60자 이하로 입력해주세요.').max(60, '사이트 제목은 1자 이상 60자 이하로 입력해주세요.').optional(),
  siteDescription: z.string({ message: '사이트 설명은 문자열로 입력해주세요.' }).min(1, '사이트 설명은 1자 이상 160자 이하로 작성해주세요.').max(160, '사이트 설명은 1자 이상 160자 이하로 작성해주세요.').optional(),
  siteUrl: z.string().refine(isUrlWithTld, { message: '사이트 URL은 http:// 또는 https://로 시작하고, .com이나 .dev 등으로 끝나는 올바른 주소여야 해요.' }).optional(),
  postsPerPage: z.number({ message: '페이지당 포스트 수는 숫자로 입력해주세요.' }).int('페이지당 포스트 수는 숫자로 입력해주세요.').min(5, '페이지당 포스트 수는 최소 5개 이상이어야 해요.').max(50, '페이지당 포스트 수는 최대 50개까지 설정할 수 있어요.').optional(),
  profileImageUrl: z.string().refine(isHttpUrl, { message: '프로필 이미지는 http(s) URL이어야 해요.' }).optional(),
  profileImageRemove: z.boolean({ message: '프로필 이미지를 제거할지 여부는 true/false로 입력해주세요.' }).optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export class SettingsError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export async function updateSettings(input: UpdateSettingsInput, userId: string): Promise<BlogSettingsView> {
  const current = await getSettings();
  const updates: { key: string; value: string }[] = [];
  const changed = <K extends keyof BlogSettingsView>(field: K, value: BlogSettingsView[K] | undefined) => value !== undefined && value !== current[field];
  if (changed('siteTitle', input.siteTitle)) updates.push({ key: SETTINGS_KEYS.siteTitle, value: input.siteTitle! });
  if (changed('siteDescription', input.siteDescription)) updates.push({ key: SETTINGS_KEYS.siteDescription, value: input.siteDescription! });
  if (changed('siteUrl', input.siteUrl)) updates.push({ key: SETTINGS_KEYS.siteUrl, value: input.siteUrl! });
  if (changed('postsPerPage', input.postsPerPage)) updates.push({ key: SETTINGS_KEYS.postsPerPage, value: String(input.postsPerPage) });

  const mover = new MediaMover(env.MEDIA, env.MEDIA_BASE_URL);
  let nextImage = current.profileImageUrl;
  let deletePrevious = false;
  if (input.profileImageRemove) {
    nextImage = null;
    deletePrevious = true;
  } else if (input.profileImageUrl) {
    if (input.profileImageUrl.includes('/draft/')) {
      try {
        nextImage = await mover.finalizeAbout(input.profileImageUrl);
      } catch (error) {
        if (error instanceof InvalidUploadKeyError) throw new SettingsError(400, 'INVALID_UPLOAD_KEY', error.message);
        throw error;
      }
      deletePrevious = true;
    } else {
      nextImage = input.profileImageUrl;
    }
  }
  if (nextImage !== current.profileImageUrl) updates.push({ key: SETTINGS_KEYS.profileImageUrl, value: nextImage ?? '' });
  if (updates.length === 0) return current;

  const db = getDb();
  const now = new Date();
  try {
    await db.batch(
      updates.map((u) =>
        db.insert(schema.settings).values({ id: uuidv7(), key: u.key, value: u.value, updatedAt: now, updatedBy: userId })
          .onConflictDoUpdate({ target: schema.settings.key, set: { value: sql`excluded.value`, updatedAt: now, updatedBy: userId } }),
      ) as never,
    );
  } catch (error) {
    await mover.rollback();
    throw error;
  }
  await mover.deleteKeys(mover.drafts);
  if (deletePrevious && current.profileImageUrl && current.profileImageUrl !== nextImage) await mover.deleteUrls([current.profileImageUrl]);
  return getSettings();
}
