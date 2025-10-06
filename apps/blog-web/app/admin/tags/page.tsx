import Link from "next/link"
import { notFound } from "next/navigation"
import { PenSquare } from "lucide-react"

import type { TagsQuery } from "@repo/shared"
import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { getAuthorizationToken } from "@/lib/auth"
import {
  AdminModal,
  AdminStatusBanner,
  DeleteConfirmButton,
  TagForm,
} from "@/components/admin"
import {
  createAdminTagAction,
  deleteAdminTagAction,
  updateAdminTagAction,
} from "@/lib/admin/tags-actions"

interface TagsPageProps {
  searchParams?: Promise<{
    page?: string
    search?: string
    status?: string
    message?: string
    modal?: string
    slug?: string
  }>
}

export default async function AdminTagsPage({ searchParams }: TagsPageProps) {
  const token = await getAuthorizationToken()

  const resolvedSearchParams = searchParams ? await searchParams : {}

  const page = Number(resolvedSearchParams.page ?? '1') || 1
  const search = resolvedSearchParams.search?.trim() ?? ''
  const statusParam = resolvedSearchParams.status
  const messageParam = resolvedSearchParams.message
  const modal = resolvedSearchParams.modal
  const modalSlug = resolvedSearchParams.slug

  const query: TagsQuery = {
    page,
    limit: 30,
    order: 'asc',
    sort: 'name',
    search: search || undefined,
  }

  const response = token
    ? await apiClient.tags.getTags(query, { token })
    : await apiClient.tags.getTags(query)

  if (!response || !isSuccessResponse(response)) {
    notFound()
  }

  const tags = response.data ?? []
  const total = response.meta?.total ?? tags.length
  const baseQuery: Record<string, string> = {}
  if (search) baseQuery.search = search
  if (page > 1) baseQuery.page = String(page)
  const editingTag = modalSlug ? tags.find((tag) => tag.slug === modalSlug) : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">태그 관리</h2>
          <p className="text-sm text-slate-500">태그를 추가하고 정리해 콘텐츠 검색성을 높여보세요.</p>
        </div>
        <Link
          href={{
            pathname: '/admin/tags',
            query: { ...baseQuery, modal: 'create' },
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          <PenSquare className="h-4 w-4" aria-hidden /> 새 태그
        </Link>
      </div>

      <AdminStatusBanner
        status={statusParam as 'created' | 'updated' | 'deleted' | 'error' | undefined}
        message={messageParam}
      />

      <form className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <label htmlFor="search" className="text-xs font-medium text-slate-300">
            검색어
          </label>
          <input
            id="search"
            name="search"
            placeholder="태그 이름 또는 슬러그"
            defaultValue={search}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            검색
          </button>
          <Link
            href="/admin/tags"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            초기화
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/70">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">이름</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">슬러그</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">포스트 수</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/30">
            {tags.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                  아직 등록된 태그가 없어요. 새 태그를 추가해 보세요!
                </td>
              </tr>
            ) : (
              tags.map((tag) => (
                <tr key={tag.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-4 text-sm text-slate-100">{tag.name}</td>
                  <td className="px-4 py-4 text-sm text-slate-300">/{tag.slug}</td>
                  <td className="px-4 py-4 text-sm text-slate-300">{tag.postCount ?? 0}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <Link
                      href={{
                        pathname: '/admin/tags',
                        query: { ...baseQuery, modal: 'edit', slug: tag.slug },
                      }}
                      className="text-emerald-300 transition hover:text-emerald-200"
                    >
                      수정
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          총 <strong className="text-slate-300">{total}</strong>개의 태그가 있습니다.
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={{
              pathname: '/admin/tags',
              query: {
                ...(search ? { search } : {}),
                page: Math.max(1, page - 1),
              },
            }}
            className="rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
          >
            이전
          </Link>
          <span className="text-xs">{page} 페이지</span>
          <Link
            href={{
              pathname: '/admin/tags',
              query: {
                ...(search ? { search } : {}),
                page: page + 1,
              },
            }}
            className="rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
          >
            다음
          </Link>
        </div>
      </div>

      {modal === 'create' ? (
        <AdminModal
          title="새 태그 추가"
          description="콘텐츠에 사용할 태그를 등록하세요."
          returnQuery={baseQuery}
        >
          <TagForm
            action={createAdminTagAction}
            submitLabel="태그 저장"
            cancelHref="/admin/tags"
          />
        </AdminModal>
      ) : null}

      {modal === 'edit' && editingTag ? (
        <AdminModal
          title="태그 수정"
          description="태그 이름과 슬러그를 변경할 수 있습니다."
          returnQuery={baseQuery}
        >
          <div className="space-y-6">
            <TagForm
              action={updateAdminTagAction}
              defaultValues={{
                name: editingTag.name,
                slug: editingTag.slug,
              }}
              submitLabel="변경 사항 저장"
              cancelHref="/admin/tags"
            />

            <form id="delete-tag-form" action={deleteAdminTagAction} className="hidden">
              <input type="hidden" name="slug" value={editingTag.slug} />
            </form>
            <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-200">
              <span>삭제하면 해당 태그가 연결된 포스트에서 제거됩니다.</span>
              <DeleteConfirmButton
                action={deleteAdminTagAction}
                formId="delete-tag-form"
                label="태그 삭제"
                confirmLabel="삭제하기"
                description="태그를 삭제하면 되돌릴 수 없어요. 계속하시겠습니까?"
                redirectUrl="/admin/tags"
                successMessage="태그가 삭제되었어요."
              />
            </div>
          </div>
        </AdminModal>
      ) : null}
    </div>
  )
}
