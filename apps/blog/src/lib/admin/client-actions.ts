// 관리자 화면(브라우저)에서 관리자 API를 부르는 함수. 이관 전 server action의 반환·이동 동작을 따른다.
type ApiBody = { success: boolean; data?: any; error?: { code: string; message: string }; fieldErrors?: Record<string, string[]> };
export type AdminResult = { ok: boolean; status: number; body: ApiBody | null };

export const FALLBACK_MESSAGE = '알 수 없는 오류가 발생했어요.';

/** 401이면 로그인 화면(error=SessionExpired, callbackUrl=returnTo)으로 보낸다. */
export async function adminFetch(method: string, path: string, body: unknown, returnTo: string): Promise<AdminResult> {
  const init: RequestInit = { method, headers: {}, credentials: 'same-origin' };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['content-type'] = 'application/json';
  }
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    return { ok: false, status: 0, body: { success: false, error: { code: 'NETWORK_ERROR', message: '서버에 연결하지 못했어요.' } } };
  }
  if (res.status === 401) {
    window.location.assign(`/auth/signin?${new URLSearchParams({ error: 'SessionExpired', callbackUrl: returnTo })}`);
    return new Promise(() => undefined);
  }
  const text = await res.text();
  let parsed: ApiBody | null = null;
  try {
    parsed = text ? (JSON.parse(text) as ApiBody) : null;
  } catch {
    parsed = null;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

export const errorMessage = (result: AdminResult, fallback = FALLBACK_MESSAGE) => result.body?.error?.message ?? fallback;

// 이관 전 features/posts/server/form-parser.ts
const str = (v: FormDataEntryValue | null) => (v === null ? undefined : String(v).trim() || undefined);
const bool = (v: FormDataEntryValue | null) => v !== null && ['true', 'on', '1', 'yes'].includes(String(v).toLowerCase());

export function postPayload(formData: FormData, mode: 'create' | 'update') {
  return {
    title: str(formData.get('title')) ?? '',
    content: mode === 'create' ? String(formData.get('content') ?? '') : str(formData.get('content')),
    excerpt: str(formData.get('excerpt')),
    coverImage: str(formData.get('coverImage')),
    coverImageKey: str(formData.get('coverImageKey')),
    published: bool(formData.get('published')),
    categoryId: str(formData.get('categoryId')) ?? '',
    tagIds: formData.getAll('tagIds').map(String).filter(Boolean),
    draftUuid: str(formData.get('draftUuid')),
  };
}

const go = (href: string) => {
  window.location.assign(href);
  return new Promise<void>(() => undefined);
};

export async function createPostAction(formData: FormData): Promise<void> {
  const result = await adminFetch('POST', '/api/admin/posts', postPayload(formData, 'create'), '/admin/posts/new');
  if (result.ok) return go('/admin/posts?status=created');
  return go(`/admin/posts/new?status=error&message=${encodeURIComponent(errorMessage(result, '포스트 생성에 실패했어요.'))}`);
}

export function updatePostAction(id: string, slug: string) {
  return async (formData: FormData): Promise<void> => {
    const returnTo = `/admin/posts/${slug}/edit`;
    const result = await adminFetch('PUT', `/api/admin/posts/${id}`, postPayload(formData, 'update'), returnTo);
    if (result.ok) return go('/admin/posts?status=updated');
    return go(`${returnTo}?status=error&message=${encodeURIComponent(errorMessage(result))}`);
  };
}

export async function deletePostAction(id: string): Promise<void> {
  const result = await adminFetch('DELETE', `/api/admin/posts/${id}`, undefined, '/admin/posts');
  if (result.ok) return go('/admin/posts?status=deleted');
  return go(`/admin/posts?status=error&message=${encodeURIComponent(errorMessage(result))}`);
}
