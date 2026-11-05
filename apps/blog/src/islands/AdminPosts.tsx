import { AdminPostsContent } from '@/components/admin/posts/admin-posts-content';
import { PostForm } from '@/components/admin/posts/post-form';
import { AdminStatusBanner } from '@/components/admin/status-banner';
import { createPostAction, deletePostAction, updatePostAction } from '@/lib/admin/client-actions';
import type { AdminPostsResult } from '@/features/posts/server/get-admin-posts';
import type { Category, Tag } from '@repo/shared';
import { RouterProvider } from 'next/navigation';
import { useState } from 'react';

export function StatusBanner({ url, status, message }: { url: string; status?: string | null; message?: string | null }) {
  return (
    <RouterProvider url={url}>
      <AdminStatusBanner status={status} message={message} />
    </RouterProvider>
  );
}

export function PostsList({ url, searchParams, data, error }: { url: string; searchParams: Record<string, string>; data: AdminPostsResult; error: string | null }) {
  return (
    <RouterProvider url={url}>
      <AdminPostsContent searchParams={searchParams} initialData={data} initialError={error} />
    </RouterProvider>
  );
}

type FormProps = { url: string; categories: Category[]; tags: Tag[] };

export function NewPostForm({ url, categories, tags, defaultDraftUuid }: FormProps & { defaultDraftUuid: string }) {
  return (
    <RouterProvider url={url}>
      <PostForm action={createPostAction} categories={categories} tags={tags} defaultDraftUuid={defaultDraftUuid} submitLabel="포스트 저장" cancelHref="/admin/posts" />
    </RouterProvider>
  );
}

export function EditPostForm({ url, categories, tags, postId, defaultValues }: FormProps & { postId: string; defaultValues: NonNullable<Parameters<typeof PostForm>[0]['defaultValues']> & { slug: string } }) {
  return (
    <RouterProvider url={url}>
      <PostForm action={updatePostAction(postId, defaultValues.slug)} categories={categories} tags={tags} defaultValues={defaultValues} submitLabel="변경 사항 저장" cancelHref="/admin/posts" />
    </RouterProvider>
  );
}

/** 이관 전 편집 화면 아래의 삭제 form(server action)을 같은 마크업으로 옮긴 것 */
export function DeletePostForm({ postId }: { postId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        await deletePostAction(postId);
      }}
      className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
    >
      <div className="text-sm text-red-200">
        <strong className="font-semibold">주의:</strong> 삭제하면 복원할 수 없어요.
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="rounded-lg border border-red-400/50 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:border-red-300 hover:text-red-100">
          포스트 삭제
        </button>
      </div>
    </form>
  );
}
