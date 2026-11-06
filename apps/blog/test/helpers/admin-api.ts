import { adminCookie } from './auth';
import { fetchPage } from './seed';

export async function adminJson(method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetchPage(path, {
    method,
    headers: headers ?? { cookie: await adminCookie(), origin: 'http://localhost:4321', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as { success: boolean; data?: any; error?: { code: string; message: string }; fieldErrors?: Record<string, string[]> }) : null };
}
