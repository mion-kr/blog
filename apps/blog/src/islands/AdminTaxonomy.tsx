import { AdminCategoriesContent } from '@/components/admin/categories/admin-categories-content';
import { AdminTagsContent } from '@/components/admin/tags/admin-tags-content';
import { registerCategoryIds } from '@/lib/admin/categories-actions';
import { registerTagIds } from '@/lib/admin/tags-actions';
import type { AdminCategoriesData } from '@/features/admin/server/get-admin-categories';
import type { AdminTagsData } from '@/features/admin/server/get-admin-tags';
import { RouterProvider } from 'next/navigation';

export function CategoriesContent({ url, searchParams, data, error }: { url: string; searchParams: Record<string, string>; data: AdminCategoriesData | null; error: string | null }) {
  registerCategoryIds(data?.categories ?? []);
  return (
    <RouterProvider url={url}>
      <AdminCategoriesContent searchParams={searchParams} initialData={data} initialError={error} />
    </RouterProvider>
  );
}

export function TagsContent({ url, searchParams, data, error }: { url: string; searchParams: Record<string, string>; data: AdminTagsData | null; error: string | null }) {
  registerTagIds(data?.tags ?? []);
  return (
    <RouterProvider url={url}>
      <AdminTagsContent searchParams={searchParams} initialData={data} initialError={error} />
    </RouterProvider>
  );
}
