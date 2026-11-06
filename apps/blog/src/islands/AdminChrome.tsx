// 관리자 사이드바·모바일 메뉴(상호작용 없음, 서버에서만 그린다)
import { AdminMobileNav } from '@/components/admin/admin-mobile-nav';
import { AdminSidebar, type AdminNavItem } from '@/components/admin/admin-sidebar';
import { RouterProvider } from 'next/navigation';

export const NAV_ITEMS: AdminNavItem[] = [
  { label: '대시보드', href: '/admin', icon: 'dashboard' },
  { label: '포스트 관리', href: '/admin/posts', icon: 'posts' },
  { label: '카테고리', href: '/admin/categories', icon: 'categories' },
  { label: '태그', href: '/admin/tags', icon: 'tags' },
  { label: '설정', href: '/admin/settings', icon: 'settings' },
];

export function Sidebar({ url, user }: { url: string; user: { name: string; email: string; image?: string | null } }) {
  return (
    <RouterProvider url={url}>
      <AdminSidebar items={NAV_ITEMS} user={user} />
    </RouterProvider>
  );
}

export function MobileNav({ url }: { url: string }) {
  return (
    <RouterProvider url={url}>
      <AdminMobileNav items={NAV_ITEMS} />
    </RouterProvider>
  );
}
