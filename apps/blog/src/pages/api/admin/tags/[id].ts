import type { APIRoute } from 'astro';
import { fail, ok } from '../../../../server/http/json';
import { readJson } from '../../../../server/http/validate';
import { deleteTaxonomy, schemas, TaxonomyError, updateTaxonomy } from '../../../../server/taxonomy';

const handle = async (run: () => Promise<void>) => {
  try {
    await run();
    return ok();
  } catch (error) {
    if (error instanceof TaxonomyError) return fail(error.status, error.code, error.message);
    console.error('tags 쓰기 실패', (error as Error).name);
    return fail(500, 'INTERNAL_ERROR', '저장하지 못했어요.');
  }
};

export const PUT: APIRoute = async ({ request, params }) => {
  const parsed = await readJson(request, schemas.tags.update);
  if (!parsed.ok) return parsed.response;
  return handle(() => updateTaxonomy('tags', params.id!, parsed.data));
};

export const DELETE: APIRoute = ({ params }) => handle(() => deleteTaxonomy('tags', params.id!));
