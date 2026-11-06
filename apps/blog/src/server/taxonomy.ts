// 관리자 카테고리·태그 쓰기(이관 전 categories.service·tags.service)
import { z } from 'astro/zod';
import { and, count, eq, ne } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { getDb, schema } from './db';

export class TaxonomyError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MESSAGE = '슬러그는 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다.';
// 이관 전 categories-actions: description·color는 trim 후 빈 값이면 없는 값
const optionalTrim = z.preprocess((v) => (typeof v === 'string' ? v.trim() || undefined : v), z.string().optional());

const categoryFields = {
  name: z.string().min(1, '카테고리 이름은 최소 1자 이상이어야 합니다.').max(50, '카테고리 이름은 최대 50자까지 가능합니다.'),
  slug: z.string().regex(SLUG, SLUG_MESSAGE).max(100, '슬러그는 최대 100자까지 가능합니다.'),
  description: optionalTrim.refine((v) => v === undefined || v.length <= 500, { message: '설명은 최대 500자까지 가능합니다.' }),
  // 색상은 검증만 하고 저장하지 않는다(이관 전에도 컬럼이 없다).
  color: optionalTrim.refine((v) => v === undefined || /^#[0-9A-F]{6}$/i.test(v), { message: '색상은 올바른 hex 코드 형식이어야 합니다. (예: #3B82F6)' }),
};
const tagFields = {
  name: z.string().min(1, '태그 이름은 최소 1자 이상이어야 합니다.').max(30, '태그 이름은 최대 30자까지 가능합니다.'),
  slug: z.string().regex(SLUG, SLUG_MESSAGE).max(50, '슬러그는 최대 50자까지 가능합니다.'),
};

export const schemas = {
  categories: { create: z.object(categoryFields), update: z.object(categoryFields).partial() },
  tags: { create: z.object(tagFields), update: z.object(tagFields).partial() },
};

export type Kind = 'categories' | 'tags';
const LABEL = { categories: { code: 'CATEGORY', name: '카테고리' }, tags: { code: 'TAG', name: '태그' } };
const table = (kind: Kind) => (kind === 'categories' ? schema.categories : schema.tags);

async function ensureUnique(kind: Kind, field: 'name' | 'slug', value: string, excludeId?: string) {
  const t = table(kind);
  const db = getDb();
  const condition = excludeId ? and(eq(t[field], value), ne(t.id, excludeId)) : eq(t[field], value);
  if (await db.select({ id: t.id }).from(t).where(condition).get()) {
    const { code, name } = LABEL[kind];
    throw new TaxonomyError(409, `${code}_${field.toUpperCase()}_TAKEN`, field === 'slug' ? `슬러그 '${value}'가 이미 존재합니다.` : `${name} 이름 '${value}'이 이미 존재합니다.`);
  }
}

export async function createTaxonomy(kind: Kind, input: { name: string; slug: string; description?: string }) {
  await ensureUnique(kind, 'slug', input.slug);
  await ensureUnique(kind, 'name', input.name);
  const now = new Date();
  const id = uuidv7();
  const values = { id, name: input.name, slug: input.slug, postCount: 0, createdAt: now, updatedAt: now };
  const db = getDb();
  if (kind === 'categories') await db.insert(schema.categories).values({ ...values, description: input.description ?? null });
  else await db.insert(schema.tags).values(values);
  return { id };
}

async function findOrThrow(kind: Kind, id: string) {
  const t = table(kind);
  const row = await getDb().select().from(t).where(eq(t.id, id)).get();
  if (!row) throw new TaxonomyError(404, `${LABEL[kind].code}_NOT_FOUND`, `${LABEL[kind].name}를 찾을 수 없습니다.`);
  return row;
}

export async function updateTaxonomy(kind: Kind, id: string, input: { name?: string; slug?: string; description?: string }) {
  const existing = await findOrThrow(kind, id);
  // 수정은 이름을 먼저 검사한다(이관 전과 같음)
  if (input.name && input.name !== existing.name) await ensureUnique(kind, 'name', input.name, id);
  if (input.slug && input.slug !== existing.slug) await ensureUnique(kind, 'slug', input.slug, id);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) set.name = input.name;
  if (input.slug !== undefined) set.slug = input.slug;
  if (kind === 'categories' && input.description !== undefined) set.description = input.description;
  const t = table(kind);
  await getDb().update(t).set(set).where(eq(t.id, id));
}

export async function deleteTaxonomy(kind: Kind, id: string) {
  await findOrThrow(kind, id);
  const db = getDb();
  // 연결된 글 수(초안 포함)
  const used = kind === 'categories'
    ? await db.select({ n: count() }).from(schema.posts).where(eq(schema.posts.categoryId, id)).get()
    : await db.select({ n: count() }).from(schema.postTags).where(eq(schema.postTags.tagId, id)).get();
  if ((used?.n ?? 0) > 0) throw new TaxonomyError(409, `${LABEL[kind].code}_IN_USE`, `이 ${LABEL[kind].name}를 사용하는 포스트가 ${used!.n}개 있어 삭제할 수 없습니다.`);
  const t = table(kind);
  await db.delete(t).where(eq(t.id, id));
}
