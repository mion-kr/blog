import type { z } from 'astro/zod';
import { fail } from './json';

export const VALIDATION_MESSAGE = '입력 데이터가 올바르지 않습니다.';

/** JSON 본문을 읽고 스키마로 검증한다. 실패하면 400 VALIDATION_FAILED + fieldErrors 응답을 돌려준다. */
export async function readJson<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: fail(400, 'VALIDATION_FAILED', VALIDATION_MESSAGE) };
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? '_');
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, response: fail(400, 'VALIDATION_FAILED', VALIDATION_MESSAGE, fieldErrors) };
}
