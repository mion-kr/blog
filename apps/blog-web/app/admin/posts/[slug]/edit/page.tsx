import Link from "next/link"
import { notFound } from "next/navigation"

import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { getAuthorizationToken } from "@/lib/auth"
import { AdminStatusBanner, PostForm } from "@/components/admin"
import {
  deleteAdminPostAction,
  updateAdminPostAction,
} from "@/lib/admin/posts-actions"

interface AdminPostEditPageProps {
  params: {
    slug: string
  }
  searchParams?: {
    status?: string
    message?: string
  }
}

export default async function AdminPostEditPage({ params, searchParams }: AdminPostEditPageProps) {
  const token = await getAuthorizationToken()
  const slug = decodeURIComponent(params.slug)

  const [postRes, categoriesRes, tagsRes] = await Promise.all([
    token
      ? apiClient.posts.getPostBySlug(slug, { token })
      : apiClient.posts.getPostBySlug(slug),
    apiClient.categories.getCategories({ limit: 100 }, token ? { token } : undefined),
    apiClient.tags.getTags({ limit: 200 }, token ? { token } : undefined),
  ])

  if (!postRes || !isSuccessResponse(postRes) || !postRes.data) {
    notFound()
  }

  const post = postRes.data
  const categories = categoriesRes.data ?? []
  const tags = tagsRes.data ?? []
  const statusParam = searchParams?.status
  const messageParam = searchParams?.message

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/admin/posts" className="hover:text-slate-300">
            포스트 관리
          </Link>
          <span>›</span>
          <span className="text-slate-300">{post.title}</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-50">포스트 수정</h2>
        <p className="text-sm text-slate-500">
          수정 사항을 저장하면 즉시 반영돼요. 발행 상태도 여기서 변경할 수 있습니다.
        </p>
      </div>

      <AdminStatusBanner
        status={statusParam as 'created' | 'updated' | 'deleted' | 'error' | undefined}
        message={messageParam}
      />

      <PostForm
        action={updateAdminPostAction}
        categories={categories}
        tags={tags}
        defaultValues={{
          slug: post.slug,
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          published: post.published,
          categoryId: post.category?.id ?? post.categoryId,
          tagIds: post.tags?.map((tag) => tag.id) ?? [],
        }}
        submitLabel="변경 사항 저장"
        cancelHref="/admin/posts"
      />

      <form
        action={deleteAdminPostAction}
        className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
      >
        <div className="text-sm text-red-200">
          <strong className="font-semibold">주의:</strong> 삭제하면 복원할 수 없어요.
        </div>
        <div className="flex items-center gap-2">
          <input type="hidden" name="slug" value={post.slug} />
          <button
            type="submit"
            className="rounded-lg border border-red-400/50 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:border-red-300 hover:text-red-100"
          >
            포스트 삭제
          </button>
        </div>
      </form>
    </div>
  )
}
