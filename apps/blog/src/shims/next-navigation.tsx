// next/navigation 대체. 서버 렌더에서는 RouterProvider의 url, 브라우저에서는 location을 쓴다.
import { createContext, useContext, type ReactNode } from 'react';

const UrlContext = createContext<string | null>(null);

export function RouterProvider({ url, children }: { url: string; children: ReactNode }) {
  return <UrlContext.Provider value={url}>{children}</UrlContext.Provider>;
}

function useCurrentUrl(): URL {
  const url = useContext(UrlContext);
  if (typeof window !== 'undefined') return new URL(window.location.href);
  return new URL(url ?? 'http://localhost/');
}

export const usePathname = () => useCurrentUrl().pathname;
export const useSearchParams = () => useCurrentUrl().searchParams;
export function useRouter() {
  return {
    push: (href: string, _options?: { scroll?: boolean }) => window.location.assign(href),
    replace: (href: string, _options?: { scroll?: boolean }) => window.location.replace(href),
    refresh: () => window.location.reload(),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    prefetch: () => undefined,
  };
}
