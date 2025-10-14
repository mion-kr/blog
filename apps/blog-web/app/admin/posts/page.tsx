import Link from "next/link"
import { PenSquare } from "lucide-react"

import { AdminPostsContent, AdminStatusBanner } from "@/components/admin"

interface PostsPageProps {
  searchParams?: Promise<Record<string, string | undefined>>
}

export default async function AdminPostsPage({ searchParams }: PostsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const search = resolvedSearchParams.search?.trim() ?? ""
  const published = resolvedSearchParams.published
  const statusParam = resolvedSearchParams.status
  const messageParam = resolvedSearchParams.message

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">포스트 관리</h2>
          <p className="text-sm text-slate-500">
            발행된 글과 초안을 한 곳에서 확인하고 관리하세요.
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
        >
          <PenSquare className="h-4 w-4" aria-hidden /> 새 포스트 작성
        </Link>
      </div>

      <AdminStatusBanner
        status={statusParam as "created" | "updated" | "deleted" | "error" | undefined}
        message={messageParam}
      />

      <form className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-[1fr_auto_auto]">
        <div className="grid gap-2">
          <label htmlFor="search" className="text-xs font-medium text-slate-300">
            검색어
          </label>
          <input
            id="search"
            name="search"
            placeholder="제목, 본문, 요약에서 검색"
            defaultValue={search}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="published" className="text-xs font-medium text-slate-300">
            발행 상태
          </label>
          <select
            id="published"
            name="published"
            defaultValue={published ?? ""}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          >
            <option value="">전체</option>
            <option value="true">발행됨</option>
            <option value="false">초안</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            필터 적용
          </button>
          <Link
            href="/admin/posts"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            초기화
          </Link>
        </div>
      </form>

      <AdminPostsContent searchParams={resolvedSearchParams} />
    </div>
  )
}
