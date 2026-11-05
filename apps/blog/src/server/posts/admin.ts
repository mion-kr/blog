import { and, eq, inArray, like, ne, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { slugFromTitle, slugBase } from '../../lib/slug';
import { getDb, schema, type Db } from '../db';
import { env } from '../env';
import { InvalidUploadKeyError, MediaMover, contentKeys } from '../uploads/finalize';
import type { CreatePostInput, UpdatePostInput } from './input';
import { nextPublishedAt, shouldRegenerateSlug } from './rules';

const { posts, postTags, categories, tags } = schema;

export class PostError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

async function ensureCategory(db: Db, categoryId: string) {
  const found = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).get();
  if (!found) throw new PostError(400, 'CATEGORY_NOT_FOUND', `카테고리 ID '${categoryId}'를 찾을 수 없습니다.`);
}

/** 이관 전처럼 존재하는 태그 수가 요청 수와 다르면 400(중복 ID 포함) */
async function ensureTags(db: Db, tagIds: string[]) {
  const found = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds));
  if (found.length !== tagIds.length) {
    const existing = new Set(found.map((t) => t.id));
    throw new PostError(400, 'TAG_NOT_FOUND', `다음 태그 ID를 찾을 수 없습니다: ${tagIds.filter((id) => !existing.has(id)).join(', ')}`);
  }
}

async function uniqueSlug(db: Db, title: string, excludeId?: string) {
  const base = slugBase(title);
  const rows = await db
    .select({ slug: posts.slug })
    .from(posts)
    .where(excludeId ? and(like(posts.slug, `${base}%`), ne(posts.id, excludeId)) : like(posts.slug, `${base}%`));
  return slugFromTitle(title, rows.map((r) => r.slug));
}

/** 카테고리·태그 post_count를 실제 연결 수(초안 포함)로 다시 센다. updated_at도 갱신(이관 전과 같음). */
function recountStatements(db: Db, categoryIds: string[], tagIds: string[], now: Date) {
  const statements = [];
  if (categoryIds.length) {
    statements.push(db.update(categories).set({ postCount: sql`(SELECT count(*) FROM posts p WHERE p.category_id = categories.id)`, updatedAt: now }).where(inArray(categories.id, categoryIds)));
  }
  if (tagIds.length) {
    statements.push(db.update(tags).set({ postCount: sql`(SELECT count(*) FROM post_tags pt WHERE pt.tag_id = tags.id)`, updatedAt: now }).where(inArray(tags.id, tagIds)));
  }
  return statements;
}

function mapUploadError(error: unknown): never {
  if (error instanceof InvalidUploadKeyError) throw new PostError(400, 'INVALID_UPLOAD_KEY', error.message);
  if (error instanceof PostError) throw error;
  console.error('이미지 확정 실패', (error as Error).name);
  throw new PostError(500, 'STORAGE_ERROR', '이미지를 저장하지 못했어요.');
}

export async function createPost(input: CreatePostInput, authorId: string) {
  const db = getDb();
  await ensureCategory(db, input.categoryId);
  await ensureTags(db, input.tagIds);
  const id = uuidv7();
  const slug = await uniqueSlug(db, input.title);
  const mover = new MediaMover(env.MEDIA, env.MEDIA_BASE_URL);
  let coverImage: string | null;
  let content: string;
  try {
    coverImage = await mover.finalizeCover({ draftUuid: input.draftUuid, objectKey: input.coverImageKey, postId: id, current: input.coverImage ?? null });
    content = await mover.finalizeContent({ draftUuid: input.draftUuid, postId: id, content: input.content });
  } catch (error) {
    await mover.rollback();
    mapUploadError(error);
  }
  const now = new Date();
  try {
    await db.batch([
      db.insert(posts).values({ id, title: input.title, slug, content, excerpt: input.excerpt ?? null, coverImage, published: input.published, categoryId: input.categoryId, authorId, createdAt: now, updatedAt: now, publishedAt: input.published ? now : null }),
      db.insert(postTags).values(input.tagIds.map((tagId) => ({ postId: id, tagId, createdAt: now }))),
      ...recountStatements(db, [input.categoryId], input.tagIds, now),
    ] as never);
  } catch (error) {
    await mover.rollback();
    throw error;
  }
  await mover.deleteKeys(mover.drafts);
  return { id, slug };
}

export async function updatePost(id: string, input: UpdatePostInput) {
  const db = getDb();
  const existing = await db.select().from(posts).where(eq(posts.id, id)).get();
  if (!existing) throw new PostError(404, 'POST_NOT_FOUND', '포스트를 찾을 수 없습니다.');
  if (input.categoryId !== existing.categoryId) await ensureCategory(db, input.categoryId);
  await ensureTags(db, input.tagIds);
  const slug = shouldRegenerateSlug(existing, input.title) ? await uniqueSlug(db, input.title, id) : existing.slug;
  const previousTags = (await db.select({ tagId: postTags.tagId }).from(postTags).where(eq(postTags.postId, id))).map((t) => t.tagId);
  const mover = new MediaMover(env.MEDIA, env.MEDIA_BASE_URL);
  let coverImage: string | null;
  let content: string;
  try {
    coverImage = await mover.finalizeCover({ draftUuid: input.draftUuid, objectKey: input.coverImageKey, postId: id, current: input.coverImage ?? null });
    content = await mover.finalizeContent({ draftUuid: input.draftUuid, postId: id, content: input.content ?? existing.content });
  } catch (error) {
    await mover.rollback();
    mapUploadError(error);
  }
  const now = new Date();
  try {
    await db.batch([
      db.update(posts).set({ title: input.title, slug, content, excerpt: input.excerpt ?? null, coverImage, published: input.published, categoryId: input.categoryId, updatedAt: now, publishedAt: nextPublishedAt(existing, input.published, now) }).where(eq(posts.id, id)),
      db.delete(postTags).where(eq(postTags.postId, id)),
      db.insert(postTags).values(input.tagIds.map((tagId) => ({ postId: id, tagId, createdAt: now }))),
      ...recountStatements(db, [...new Set([existing.categoryId, input.categoryId])], [...new Set([...previousTags, ...input.tagIds])], now),
    ] as never);
  } catch (error) {
    await mover.rollback();
    throw error;
  }
  // 성공 뒤 정리: draft 원본, 바뀐 이전 커버, 본문에서 빠진 이미지(삭제 실패는 로그만)
  await mover.deleteKeys(mover.drafts);
  if (existing.coverImage && existing.coverImage !== coverImage) await mover.deleteUrls([existing.coverImage]);
  const prefix = `posts/${id}/content/`;
  const kept = contentKeys(content, prefix, env.MEDIA_BASE_URL);
  await mover.deleteKeys([...contentKeys(existing.content, prefix, env.MEDIA_BASE_URL)].filter((k) => !kept.has(k)));
  return { slug };
}

export async function deletePost(id: string) {
  const db = getDb();
  const existing = await db.select().from(posts).where(eq(posts.id, id)).get();
  if (!existing) throw new PostError(404, 'POST_NOT_FOUND', '포스트를 찾을 수 없습니다.');
  const tagIds = (await db.select({ tagId: postTags.tagId }).from(postTags).where(eq(postTags.postId, id))).map((t) => t.tagId);
  const now = new Date();
  await db.batch([db.delete(postTags).where(eq(postTags.postId, id)), db.delete(posts).where(eq(posts.id, id)), ...recountStatements(db, [existing.categoryId], tagIds, now)] as never);
  const mover = new MediaMover(env.MEDIA, env.MEDIA_BASE_URL);
  await mover.deleteUrls([existing.coverImage]);
  await mover.deleteKeys([...contentKeys(existing.content, `posts/${id}/content/`, env.MEDIA_BASE_URL)]);
}
