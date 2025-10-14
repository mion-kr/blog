import Link from "next/link"
import { PenSquare } from "lucide-react"

import { AdminStatusBanner, AdminTagsContent } from "@/components/admin"

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
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const search = resolvedSearchParams.search?.trim() ?? ""
  const statusParam = resolvedSearchParams.status
  const messageParam = resolvedSearchParams.message

  const baseQuery = {
    ...(search ? { search } : {}),
    ...(resolvedSearchParams.page ? { page: resolvedSearchParams.page } : {}),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">태그 관리</h2>
          <p className="text-sm text-slate-500">
            태그를 추가하고 정리해 콘텐츠 검색성을 높여보세요.
          </p>
        </div>
        <Link
          href={{
            pathname: "/admin/tags",
            query: { ...baseQuery, modal: "create" },
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          <PenSquare className="h-4 w-4" aria-hidden /> 새 태그
        </Link>
      </div>

      <AdminStatusBanner
        status={statusParam as "created" | "updated" | "deleted" | "error" | undefined}
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

      <AdminTagsContent searchParams={resolvedSearchParams} />
    </div>
  )
}
