import Link from "next/link"
import { notFound } from "next/navigation"
import { FileText, PenSquare } from "lucide-react"

import type { PostsQuery } from "@repo/shared"
import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { getAuthorizationToken } from "@/lib/auth"
import { AdminStatusBanner } from "@/components/admin"

type PostsSearchParams = {
  page?: string
  search?: string
  published?: string
  status?: string
  message?: string
}

interface PostsPageProps {
  searchParams?: Promise<PostsSearchParams>
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false
  return undefined
}

function formatDate(dateLike: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  return new Intl.DateTimeFormat('ko-KR', options).format(date)
}

export default async function AdminPostsPage({ searchParams }: PostsPageProps) {
  const token = await getAuthorizationToken()

  const resolvedSearchParams = searchParams ? await searchParams : {}

  const pageParam = resolvedSearchParams.page
  const searchParam = resolvedSearchParams.search
  const publishedParam = resolvedSearchParams.published
  const statusParam = resolvedSearchParams.status
  const messageParam = resolvedSearchParams.message

  const page = Number(pageParam ?? '1') || 1
  const search = searchParam?.trim() ?? ''
  const published = parseBoolean(publishedParam)

  const query: PostsQuery = {
    page,
    limit: 20,
    order: 'desc',
    sort: 'updatedAt',
    search: search || undefined,
    published,
  }

  const response = token
    ? await apiClient.posts.getPosts(query, { token })
    : await apiClient.posts.getPosts(query)

  if (!response || !isSuccessResponse(response)) {
    notFound()
  }

  const posts = response.data ?? []
  const total = response.meta?.total ?? posts.length

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
        status={statusParam as 'created' | 'updated' | 'deleted' | 'error' | undefined}
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
            defaultValue={
              published === undefined ? '' : published ? 'true' : 'false'
            }
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

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/70">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                제목
              </th>
              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 md:table-cell">
                카테고리
              </th>
              <th scope="col" className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">
                태그
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                상태
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                수정
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/30">
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="h-10 w-10 text-slate-700" aria-hidden />
                    아직 등록된 포스트가 없거나 검색 조건에 맞는 결과가 없어요.
                  </div>
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-900/50">
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-slate-100 line-clamp-1">
                        {post.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {post.published
                          ? `발행일 ${formatDate(post.publishedAt ?? post.createdAt, { dateStyle: 'medium' })}`
                          : `마지막 수정 ${formatDate(post.updatedAt, { dateStyle: 'medium', timeStyle: 'short' })}`}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 text-sm text-slate-300 md:table-cell">
                    {post.category?.name ?? '-'}
                  </td>
                  <td className="hidden px-4 py-4 text-sm text-slate-300 lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {post.tags?.length
                        ? post.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full bg-slate-800/80 px-2 py-0.5 text-xs text-slate-200"
                            >
                              {tag.name}
                            </span>
                          ))
                        : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={
                        post.published
                          ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300'
                          : 'rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300'
                      }
                    >
                      {post.published ? '발행됨' : '초안'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right text-sm">
                    <Link
                      href={`/admin/posts/${post.slug}/edit`}
                      className="text-emerald-300 transition hover:text-emerald-200"
                    >
                      편집
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
          총 <strong className="text-slate-300">{total}</strong>건의 포스트가 있습니다.
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={{
              pathname: '/admin/posts',
              query: {
                ...(search ? { search } : {}),
                ...(published !== undefined ? { published: String(published) } : {}),
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
              pathname: '/admin/posts',
              query: {
                ...(search ? { search } : {}),
                ...(published !== undefined ? { published: String(published) } : {}),
                page: page + 1,
              },
            }}
            className="rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-700 hover:text-slate-100"
          >
            다음
          </Link>
        </div>
      </div>
    </div>
  )
}
