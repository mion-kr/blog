// apps/blog-web/lib/auth/callback-url.ts 이식: 바깥 주소·//·\·제어문자·인코딩 우회를 막는다.
const DEFAULT_CALLBACK_URL = '/admin';

const hasControl = (v: string) => Array.from(v).some((c) => c.charCodeAt(0) <= 0x1f || c.charCodeAt(0) === 0x7f);
const looksSafe = (v: string) => v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') && !hasControl(v);

function isSafeCallbackUrl(callbackUrl: string): boolean {
  if (!looksSafe(callbackUrl)) return false;
  let decoded = callbackUrl;
  while (/%[0-9a-f]{2}/i.test(decoded)) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return false;
    }
  }
  return looksSafe(decoded);
}

export function getSafeCallbackUrl(callbackUrl?: string | null): string {
  return typeof callbackUrl === 'string' && isSafeCallbackUrl(callbackUrl) ? callbackUrl : DEFAULT_CALLBACK_URL;
}
