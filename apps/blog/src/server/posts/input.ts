import { z } from 'astro/zod';
import { isUuidV7 } from '../../lib/uuid';

// 이관 전 CreatePostDto 검증 + form-parser 공백 규칙(제목·요약·커버는 trim, 빈 값은 없는 값)
const trimmedOptional = z.preprocess((v) => (typeof v === 'string' ? v.trim() || null : v), z.string().nullable().optional());
const uuid7 = (message: string) => z.string().refine(isUuidV7, { message });
const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

const base = {
  title: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().min(1, '제목은 최소 1자 이상이어야 합니다.').max(200, '제목은 최대 200자까지 가능합니다.')),
  excerpt: trimmedOptional.refine((v) => v == null || v.length <= 500, { message: '요약은 최대 500자까지 가능합니다.' }),
  coverImage: trimmedOptional.refine((v) => v == null || isHttpUrl(v), { message: '올바른 URL 형식이어야 합니다.' }),
  coverImageKey: trimmedOptional,
  published: z.boolean({ message: '발행 여부는 boolean이어야 합니다.' }),
  categoryId: uuid7('올바른 UUIDv7 형식이어야 합니다.'),
  tagIds: z.array(uuid7('모든 태그 ID는 올바른 UUIDv7 형식이어야 합니다.')).min(1, '최소 1개 이상의 태그를 선택해야 합니다.'),
  draftUuid: trimmedOptional.refine((v) => v == null || isUuidV7(v), { message: 'Draft UUID는 UUIDv7 형식이어야 합니다.' }),
};

export const createPostSchema = z.object({ ...base, content: z.string().min(1, '내용은 필수입니다.') });
// 수정: 본문은 trim 후 비면 기존 본문 유지(이관 전 form-parser)
export const updatePostSchema = z.object({ ...base, content: z.preprocess((v) => (typeof v === 'string' ? v.trim() || undefined : v), z.string().optional()) });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
