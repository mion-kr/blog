import Link from "next/link"

import { apiClient } from "@/lib/api-client"
import { getAuthorizationToken } from "@/lib/auth"
import { AdminStatusBanner, PostForm } from "@/components/admin"
import { createAdminPostAction } from "@/lib/admin/posts-actions"

interface AdminNewPostPageProps {
  searchParams?: {
    status?: string
    message?: string
  }
}

export default async function AdminNewPostPage({ searchParams }: AdminNewPostPageProps) {
  const token = await getAuthorizationToken()

  const [categoriesRes, tagsRes] = await Promise.all([
    apiClient.categories.getCategories({ limit: 100 }, token ? { token } : undefined),
    apiClient.tags.getTags({ limit: 100 }, token ? { token } : undefined),
  ])

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
          <span className="text-slate-300">새 포스트 작성</span>
        </div>
        <h2 className="text-2xl font-semibold text-slate-50">새 포스트 작성</h2>
        <p className="text-sm text-slate-500">
          기본 정보와 본문을 입력한 뒤 저장하면 초안 또는 발행 상태로 관리할 수 있어요.
        </p>
      </div>

      <AdminStatusBanner
        status={statusParam as 'created' | 'updated' | 'deleted' | 'error' | undefined}
        message={messageParam}
      />

      <PostForm
        action={createAdminPostAction}
        categories={categories}
        tags={tags}
        submitLabel="포스트 저장"
        cancelHref="/admin/posts"
      />
    </div>
  )
}
