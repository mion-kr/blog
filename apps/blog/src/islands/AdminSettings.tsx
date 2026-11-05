import { BlogInfoForm } from '@/components/admin/settings/blog-info-form';
import { PostSettingsForm } from '@/components/admin/settings/post-settings-form';
import { updateAdminBlogInfoAction, updateAdminPostSettingsAction } from '@/lib/admin/settings-actions';
import { RouterProvider } from 'next/navigation';

export function BlogInfo({ url, initialData }: { url: string; initialData: { siteTitle: string; siteDescription: string; siteUrl: string; profileImageUrl?: string } }) {
  return (
    <RouterProvider url={url}>
      <BlogInfoForm action={updateAdminBlogInfoAction} initialData={initialData} />
    </RouterProvider>
  );
}

export function PostSettings({ url, postsPerPage }: { url: string; postsPerPage: number }) {
  return (
    <RouterProvider url={url}>
      <PostSettingsForm action={updateAdminPostSettingsAction} initialData={{ postsPerPage }} />
    </RouterProvider>
  );
}
