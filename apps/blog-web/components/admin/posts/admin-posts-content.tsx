"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FileText, RotateCw } from "lucide-react"

import type { PostResponseDto, PostsQuery } from "@repo/shared"

import { cn } from "@/lib/utils"
import { AdminPostsTableSkeleton } from "./admin-posts-skeleton"

interface AdminPostsContentProps {
  searchParams: {
    page?: string
    search?: string
    published?: string
    sort?: string
    order?: string
    limit?: string
  }
}

interface PostsFetchPayload {
  posts: PostResponseDto[]
  total: number
  postsPerPage: number
  query: PostsQuery
}

function buildQueryString(params: AdminPostsContentProps["searchParams"]) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value))
    }
  })

  return search.toString()
}

export function AdminPostsContent({ searchParams }: AdminPostsContentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PostsFetchPayload | null>(null)
  const [reloadFlag, setReloadFlag] = useState(0)

  const queryString = useMemo(() => buildQueryString(searchParams), [searchParams])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadPosts() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(
          queryString ? `/api/admin/posts?${queryString}` : "/api/admin/posts",
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        )

        const payload = (await response.json().catch(() => null)) as
          | { data?: PostsFetchPayload; message?: string }
          | null

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message ?? "포스트를 불러오지 못했어요.")
        }

        if (isMounted) {
          setData(payload.data)
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const message =
            err instanceof Error ? err.message : "포스트를 불러오지 못했어요."
          setError(message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadPosts()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [queryString, reloadFlag])

  const page = (data?.query.page ?? Number(searchParams.page ?? "1")) || 1
  const limit = (data?.query.limit ?? Number(searchParams.limit ?? "10")) || 10
  const total = data?.total ?? 0
  const hasPrev = page > 1
  const hasNext = page * limit < total

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (searchParams.search) params.set("search", searchParams.search)
    if (searchParams.published) params.set("published", searchParams.published)
    if (searchParams.sort) params.set("sort", searchParams.sort)
    if (searchParams.order) params.set("order", searchParams.order)
    return params
  }, [searchParams.search, searchParams.published, searchParams.sort, searchParams.order])

  const handleRetry = () => {
    setReloadFlag((flag) => flag + 1)
  }

  if (loading && !data) {
    return <AdminPostsTableSkeleton />
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

  const posts = data?.posts ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          총 <strong className="text-slate-300">{total}</strong>건의 포스트가 있습니다.
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={{
              pathname: "/admin/posts",
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
              pathname: "/admin/posts",
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

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-950/70">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                제목
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 md:table-cell">
                카테고리
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 lg:table-cell">
                태그
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                상태
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                          ? `발행일 ${new Intl.DateTimeFormat("ko-KR", {
                              dateStyle: "medium",
                            }).format(new Date(post.publishedAt ?? post.createdAt ?? Date.now()))}`
                          : `마지막 수정 ${new Intl.DateTimeFormat("ko-KR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(post.updatedAt ?? Date.now()))}`}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-4 text-sm text-slate-300 md:table-cell">
                    {post.category?.name ?? "-"}
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
                        : "-"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span
                      className={
                        post.published
                          ? "rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300"
                          : "rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300"
                      }
                    >
                      {post.published ? "발행됨" : "초안"}
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
    </div>
  )
}
