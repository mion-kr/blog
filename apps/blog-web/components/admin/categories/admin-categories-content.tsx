"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { RotateCw } from "lucide-react"

import type { CategoriesQuery, Category } from "@repo/shared"

import {
  AdminModal,
  CategoryForm,
  DeleteConfirmButton,
} from "@/components/admin"
import {
  createAdminCategoryAction,
  deleteAdminCategoryAction,
  updateAdminCategoryAction,
} from "@/lib/admin/categories-actions"
import { cn } from "@/lib/utils"

import { AdminCategoriesTableSkeleton } from "./admin-categories-skeleton"

interface AdminCategoriesContentProps {
  searchParams: {
    page?: string
    search?: string
    modal?: string
    slug?: string
    status?: string
    message?: string
  }
}

interface CategoriesFetchPayload {
  categories: Category[]
  total: number
  query: CategoriesQuery
}

export function AdminCategoriesContent({ searchParams }: AdminCategoriesContentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CategoriesFetchPayload | null>(null)
  const [reloadFlag, setReloadFlag] = useState(0)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (searchParams.page) params.set("page", searchParams.page)
    if (searchParams.search) params.set("search", searchParams.search)
    return params.toString()
  }, [searchParams.page, searchParams.search])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadCategories() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          queryString ? `/api/admin/categories?${queryString}` : "/api/admin/categories",
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        )

        const payload = (await response.json().catch(() => null)) as
          | { data?: CategoriesFetchPayload; message?: string }
          | null

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message ?? "카테고리를 불러오지 못했어요.")
        }

        if (isMounted) {
          setData(payload.data)
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const message =
            err instanceof Error ? err.message : "카테고리를 불러오지 못했어요."
          setError(message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadCategories()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [queryString, reloadFlag, searchParams.status, searchParams.message])

  const page = (data?.query.page ?? Number(searchParams.page ?? "1")) || 1
  const limit = data?.query.limit ?? 20
  const total = data?.total ?? 0
  const hasPrev = page > 1
  const hasNext = page * limit < total
  const searchValue = searchParams.search ?? ""

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (searchValue) params.set("search", searchValue)
    if (page > 1) params.set("page", String(page))
    return params
  }, [searchValue, page])

  const modal = searchParams.modal
  const modalSlug = searchParams.slug
  const categories = data?.categories ?? []
  const editingCategory = categories.find((category) => category.slug === modalSlug)

  const handleRetry = () => {
    setReloadFlag((flag) => flag + 1)
  }

  if (loading && !data) {
    return <AdminCategoriesTableSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-10 text-center text-sm text-red-200">
        <p>{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center gap-2 rounded-lg border border-red-400/40 px-4 py-2 text-xs font-medium text-red-100 transition hover:border-red-300/60 hover:text-white"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/70">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                이름
              </th>
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
                    {category.description || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-full border border-slate-700"
                        style={{ backgroundColor: category.color ?? "#0f172a" }}
                      />
                      <span className="text-xs text-slate-500">{category.color ?? "미지정"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-300">{category.postCount ?? 0}</td>
                  <td className="px-4 py-4 text-right text-sm">
                    <Link
                      href={{
                        pathname: "/admin/categories",
                        query: {
                          ...Object.fromEntries(baseQuery.entries()),
                          modal: "edit",
                          slug: category.slug,
                        },
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
              pathname: "/admin/categories",
              query: {
                ...Object.fromEntries(baseQuery.entries()),
                page: String(Math.max(1, page - 1)),
              },
            }}
            className={cn(
              "rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-300 transition",
              hasPrev
                ? "hover:border-slate-700 hover:text-slate-100"
                : "cursor-not-allowed opacity-50",
            )}
            aria-disabled={!hasPrev}
            onClick={(event) => {
              if (!hasPrev) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
            tabIndex={hasPrev ? 0 : -1}
          >
            이전
          </Link>
          <span className="text-xs">{page} 페이지</span>
          <Link
            href={{
              pathname: "/admin/categories",
              query: {
                ...Object.fromEntries(baseQuery.entries()),
                page: String(page + 1),
              },
            }}
            className={cn(
              "rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-300 transition",
              hasNext
                ? "hover:border-slate-700 hover:text-slate-100"
                : "cursor-not-allowed opacity-50",
            )}
            aria-disabled={!hasNext}
            onClick={(event) => {
              if (!hasNext) {
                event.preventDefault()
                event.stopPropagation()
              }
            }}
            tabIndex={hasNext ? 0 : -1}
          >
            다음
          </Link>
        </div>
      </div>

      {modal === "create" ? (
        <AdminModal
          title="새 카테고리 추가"
          description="새로운 카테고리를 생성해 콘텐츠를 분류하세요."
          returnQuery={Object.fromEntries(baseQuery.entries())}
        >
          <CategoryForm
            action={createAdminCategoryAction}
            submitLabel="카테고리 저장"
            cancelHref="/admin/categories"
          />
        </AdminModal>
      ) : null}

      {modal === "edit" && editingCategory ? (
        <AdminModal
          title="카테고리 수정"
          description="카테고리 이름과 색상 등을 변경할 수 있습니다."
          returnQuery={Object.fromEntries(baseQuery.entries())}
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
    </>
  )
}
