import Link from "next/link"
import { notFound } from "next/navigation"
import { Palette, PenSquare } from "lucide-react"

import type { CategoriesQuery } from "@repo/shared"
import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { getAuthorizationToken } from "@/lib/auth"
import {
  AdminModal,
  AdminStatusBanner,
  CategoryForm,
  DeleteConfirmButton,
} from "@/components/admin"
import {
  createAdminCategoryAction,
  deleteAdminCategoryAction,
  updateAdminCategoryAction,
} from "@/lib/admin/categories-actions"

type CategoriesSearchParams = {
  page?: string
  search?: string
  status?: string
  message?: string
  modal?: string
  slug?: string
}

interface CategoriesPageProps {
  searchParams?: Promise<CategoriesSearchParams>
}

export default async function AdminCategoriesPage({ searchParams }: CategoriesPageProps) {
  const token = await getAuthorizationToken()

  const resolvedSearchParams = searchParams ? await searchParams : {}

  const pageParam = resolvedSearchParams.page
  const searchParam = resolvedSearchParams.search
  const statusParam = resolvedSearchParams.status
  const messageParam = resolvedSearchParams.message
  const modal = resolvedSearchParams.modal
  const modalSlug = resolvedSearchParams.slug

  const page = Number(pageParam ?? '1') || 1
  const search = searchParam?.trim() ?? ''

  const query: CategoriesQuery = {
    page,
    limit: 20,
    order: 'asc',
    sort: 'name',
    search: search || undefined,
  }

  const response = token
    ? await apiClient.categories.getCategories(query, { token })
    : await apiClient.categories.getCategories(query)

  if (!response || !isSuccessResponse(response)) {
    notFound()
  }

  const categories = response.data ?? []
  const total = response.meta?.total ?? categories.length

  const baseQuery: Record<string, string> = {}
  if (search) baseQuery.search = search
  if (page > 1) baseQuery.page = String(page)
  const editingCategory = modalSlug ? categories.find((c) => c.slug === modalSlug) : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">카테고리 관리</h2>
          <p className="text-sm text-slate-500">콘텐츠 분류를 생성하고 정리하세요.</p>
        </div>
        <Link
          href={{
            pathname: '/admin/categories',
            query: { ...baseQuery, modal: 'create' },
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          <PenSquare className="h-4 w-4" aria-hidden /> 새 카테고리
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
            placeholder="카테고리 이름 또는 설명"
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
            href="/admin/categories"
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
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 md:table-cell">
                설명
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                색상
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                포스트 수
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/30">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  아직 등록된 카테고리가 없어요. 새 카테고리를 추가해보세요!
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-slate-100">{category.name}</span>
                      <span className="text-xs text-slate-500">/{category.slug}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 text-sm text-slate-300 md:table-cell">
                    {category.description || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-slate-700"
                        style={{ backgroundColor: category.color ?? '#0f172a' }}
                      />
                      <span className="text-xs text-slate-500">{category.color ?? '미지정'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{category.postCount ?? 0}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <Link
                      href={{
                        pathname: '/admin/categories',
                        query: { ...baseQuery, modal: 'edit', slug: category.slug },
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
          총 <strong className="text-slate-300">{total}</strong>개의 카테고리가 있습니다.
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={{
              pathname: '/admin/categories',
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
              pathname: '/admin/categories',
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
          title="새 카테고리 추가"
          description="새로운 카테고리를 생성해 콘텐츠를 분류하세요."
          returnQuery={baseQuery}
        >
          <CategoryForm
            action={createAdminCategoryAction}
            submitLabel="카테고리 저장"
            cancelHref="/admin/categories"
          />
        </AdminModal>
      ) : null}

      {modal === 'edit' && editingCategory ? (
        <AdminModal
          title="카테고리 수정"
          description="카테고리 이름과 색상 등을 변경할 수 있습니다."
          returnQuery={baseQuery}
        >
          <div className="space-y-6">
            <CategoryForm
              action={updateAdminCategoryAction}
              defaultValues={{
                name: editingCategory.name,
                slug: editingCategory.slug,
                description: editingCategory.description ?? undefined,
                color: editingCategory.color ?? undefined,
              }}
              submitLabel="변경 사항 저장"
              cancelHref="/admin/categories"
            />

            <form id="delete-category-form" className="hidden">
              <input type="hidden" name="slug" value={editingCategory.slug} />
            </form>
            <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-200">
              <span>삭제하면 연결된 포스트에서 카테고리가 제거됩니다.</span>
              <DeleteConfirmButton
                action={deleteAdminCategoryAction}
                formId="delete-category-form"
                label="카테고리 삭제"
                confirmLabel="삭제하기"
                description="카테고리를 삭제하면 되돌릴 수 없어요. 계속하시겠습니까?"
                redirectUrl="/admin/categories"
                successMessage="카테고리가 삭제되었어요."
              />
            </div>
          </div>
        </AdminModal>
      ) : null}
    </div>
  )
}
