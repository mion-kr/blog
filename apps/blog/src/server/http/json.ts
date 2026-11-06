// 관리자 API 공통 응답 형식(design-implementation.md 공통 계약)
export const ok = (data?: unknown, status = 200) => Response.json(data === undefined ? { success: true } : { success: true, data }, { status });

export function fail(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return Response.json({ success: false, error: { code, message }, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}
