import type { APIRoute } from 'astro';
import { fail, ok } from '../../../../server/http/json';
import { readJson } from '../../../../server/http/validate';
import { deletePost, PostError, updatePost } from '../../../../server/posts/admin';
import { updatePostSchema } from '../../../../server/posts/input';

const handle = async (run: () => Promise<Response>, label: string) => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof PostError) return fail(error.status, error.code, error.message);
    console.error(label, (error as Error).name);
    return fail(500, 'INTERNAL_ERROR', '포스트를 저장하지 못했어요.');
  }
};

export const PUT: APIRoute = async ({ request, params }) => {
  const parsed = await readJson(request, updatePostSchema);
  if (!parsed.ok) return parsed.response;
  return handle(async () => ok(await updatePost(params.id!, parsed.data)), '글 수정 실패');
};

export const DELETE: APIRoute = async ({ params }) => handle(async () => (await deletePost(params.id!), ok()), '글 삭제 실패');
