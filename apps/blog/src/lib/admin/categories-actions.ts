// 이관 전 lib/admin/categories-actions.ts와 같은 함수 이름·반환. 화면 목록의 slug → id는 registerIds로 받는다.
import { adminFetch, errorMessage } from './client-actions';

type State = { success: boolean; error?: string };
const idsBySlug = new Map<string, string>();
export function registerCategoryIds(items: { id: string; slug: string }[]) {
  for (const item of items) idsBySlug.set(item.slug, item.id);
}
const str = (v: FormDataEntryValue | null) => (v === null ? undefined : String(v).trim() || undefined);
const RETURN_TO = '/admin/categories';

export async function createAdminCategoryAction(_prev: State, formData: FormData): Promise<State> {
  const payload = { name: String(formData.get('name') ?? ''), slug: String(formData.get('slug') ?? ''), description: str(formData.get('description')), color: str(formData.get('color')) };
  const result = await adminFetch('POST', '/api/admin/categories', payload, RETURN_TO);
  return result.ok ? { success: true } : { success: false, error: errorMessage(result) };
}

export async function updateAdminCategoryAction(_prev: State, formData: FormData): Promise<State> {
  const slug = str(formData.get('slug'));
  const id = slug ? idsBySlug.get(slug) : undefined;
  if (!slug || !id) return { success: false, error: '수정할 카테고리의 slug가 필요합니다.' };
  const payload = { name: str(formData.get('name')), slug: str(formData.get('nextSlug')), description: str(formData.get('description')), color: str(formData.get('color')) };
  const result = await adminFetch('PUT', `/api/admin/categories/${id}`, payload, RETURN_TO);
  return result.ok ? { success: true } : { success: false, error: errorMessage(result) };
}

export async function deleteAdminCategoryAction(formData: FormData): Promise<State> {
  const slug = str(formData.get('slug'));
  const id = slug ? idsBySlug.get(slug) : undefined;
  if (!slug || !id) return { success: false, error: '삭제할 카테고리의 slug가 필요합니다.' };
  const result = await adminFetch('DELETE', `/api/admin/categories/${id}`, undefined, RETURN_TO);
  return result.ok ? { success: true } : { success: false, error: errorMessage(result) };
}
