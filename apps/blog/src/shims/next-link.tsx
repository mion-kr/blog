// next/link 대체: 일반 a 요소(이관 전 관리자 컴포넌트를 그대로 쓰기 위한 shim). { pathname, query } 형태도 받는다.
import { forwardRef, type AnchorHTMLAttributes } from 'react';

type UrlObject = { pathname?: string; query?: Record<string, string | number | undefined | null> };
type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string | URL | UrlObject; prefetch?: boolean; scroll?: boolean; replace?: boolean };

export function toHref(href: Props['href']): string {
  if (typeof href === 'string') return href;
  if (href instanceof URL) return href.toString();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(href.query ?? {})) if (v !== undefined && v !== null) params.set(k, String(v));
  const qs = params.toString();
  return `${href.pathname ?? ''}${qs ? `?${qs}` : ''}`;
}

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, scroll: _s, replace: _r, ...rest }, ref) {
  return <a ref={ref} href={toHref(href)} {...rest} />;
});
export default Link;
