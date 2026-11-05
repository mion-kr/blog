import type { APIRoute } from 'astro';
import { fail, ok } from '../../../../server/http/json';
import { readJson } from '../../../../server/http/validate';
import { createPost, PostError } from '../../../../server/posts/admin';
import { createPostSchema } from '../../../../server/posts/input';

export const POST: APIRoute = async ({ request, locals }) => {
  const parsed = await readJson(request, createPostSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return ok(await createPost(parsed.data, locals.viewer!.id), 201);
  } catch (error) {
    if (error instanceof PostError) return fail(error.status, error.code, error.message);
    console.error('글 생성 실패', (error as Error).name);
    return fail(500, 'INTERNAL_ERROR', '포스트를 저장하지 못했어요.');
  }
};
