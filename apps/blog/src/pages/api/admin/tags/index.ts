import type { APIRoute } from 'astro';
import { fail, ok } from '../../../../server/http/json';
import { readJson } from '../../../../server/http/validate';
import { createTaxonomy, schemas, TaxonomyError } from '../../../../server/taxonomy';

export const POST: APIRoute = async ({ request }) => {
  const parsed = await readJson(request, schemas.tags.create);
  if (!parsed.ok) return parsed.response;
  try {
    return ok(await createTaxonomy('tags', parsed.data), 201);
  } catch (error) {
    if (error instanceof TaxonomyError) return fail(error.status, error.code, error.message);
    console.error('tags 생성 실패', (error as Error).name);
    return fail(500, 'INTERNAL_ERROR', '저장하지 못했어요.');
  }
};
