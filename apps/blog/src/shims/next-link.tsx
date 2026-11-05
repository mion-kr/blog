// next/link 대체: 일반 a 요소(이관 전 관리자 컴포넌트를 그대로 쓰기 위한 shim)
import { forwardRef, type AnchorHTMLAttributes } from 'react';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string | URL; prefetch?: boolean; scroll?: boolean; replace?: boolean };

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, prefetch: _p, scroll: _s, replace: _r, ...rest }, ref) {
  return <a ref={ref} href={typeof href === 'string' ? href : href.toString()} {...rest} />;
});
export default Link;
