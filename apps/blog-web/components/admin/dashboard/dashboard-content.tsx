"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { CalendarCheck2, FileText, Pencil, PlusCircle, RotateCw, Sparkles, Tags } from "lucide-react"

import type { PostResponseDto } from "@repo/shared"

import { AdminDashboardSkeleton } from "./dashboard-skeleton"

interface DashboardData {
  publishedTotal: number
  draftTotal: number
  categoryTotal: number
  tagTotal: number
  recentDrafts: PostResponseDto[]
}

interface AdminDashboardContentProps {
  userName: string
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 shadow-sm shadow-slate-950">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{title}</span>
        <Icon className="h-4 w-4 text-emerald-300" aria-hidden />
      </div>
      <div className="mt-4 text-2xl font-semibold text-slate-50">{value}</div>
      {description ? <p className="mt-2 text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}

export function AdminDashboardContent({ userName }: AdminDashboardContentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [reloadFlag, setReloadFlag] = useState(0)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadDashboard() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/admin/overview", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        })

        const payload = (await response.json().catch(() => null)) as
          | { data?: DashboardData; message?: string }
          | null

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message ?? "대시보드 데이터를 불러오지 못했어요.")
        }

        if (isMounted) {
          setData(payload.data)
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const message =
            err instanceof Error ? err.message : "대시보드 데이터를 불러오지 못했어요."
          setError(message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [reloadFlag])

  const recentDrafts = useMemo(() => data?.recentDrafts ?? [], [data])

  if (loading && !data) {
    return <AdminDashboardSkeleton />
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setData(null)
    setReloadFlag((flag) => flag + 1)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-10 text-center text-sm text-red-200">
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
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-950 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">
              어서 오세요, {userName || "관리자"}님!
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              최근 콘텐츠 현황과 활동 로그를 한 눈에 볼 수 있는 대시보드예요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/posts/new"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
            >
              <PlusCircle className="h-4 w-4" aria-hidden />
              새 글 작성하기
            </Link>
            <Link
              href="/admin/posts"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800/60"
            >
              <FileText className="h-4 w-4" aria-hidden />
              포스트 관리
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="발행된 포스트"
          value={data?.publishedTotal ?? 0}
          description="공개 상태인 게시글"
          icon={Sparkles}
        />
        <StatCard
          title="작성 중 초안"
          value={data?.draftTotal ?? 0}
          description="곧 발행될 준비 중인 콘텐츠"
          icon={Pencil}
        />
        <StatCard
          title="카테고리"
          value={data?.categoryTotal ?? 0}
          description="콘텐츠 분류"
          icon={CalendarCheck2}
        />
        <StatCard
          title="태그"
          value={data?.tagTotal ?? 0}
          description="주요 키워드"
          icon={Tags}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-50">최근 초안</h3>
              <p className="text-sm text-slate-500">마지막으로 편집한 초안 순서로 정렬했어요.</p>
            </div>
            <Link
              href="/admin/posts?tab=drafts"
              className="text-sm text-emerald-300 transition hover:text-emerald-200"
            >
              전체 보기
            </Link>
          </div>

          <div className="mt-4 space-y-4">
            {loading && data ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`draft-skeleton-${index}`}
                  className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded-md bg-slate-800/70" />
                    <div className="h-3 w-24 rounded-md bg-slate-800/50" />
                  </div>
                  <div className="h-3 w-12 rounded-md bg-slate-800/60" />
                </div>
              ))
            ) : recentDrafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
                아직 작성 중인 초안이 없어요. 새로운 아이디어를 바로 기록해보세요!
              </div>
            ) : (
              recentDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">
                      {draft.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      마지막 수정:{" "}
                      {new Date(draft.updatedAt ?? draft.createdAt ?? Date.now()).toLocaleString(
                        "ko-KR",
                        { hour12: false },
                      )}
                    </p>
                  </div>
                  {draft.slug ? (
                    <Link
                      href={`/admin/posts/${draft.slug}/edit`}
                      className="text-xs text-emerald-300 transition hover:text-emerald-200"
                    >
                      편집
                    </Link>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-medium text-slate-50">빠른 작업</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li>
              <Link className="flex items-center gap-2 hover:text-emerald-200" href="/admin/posts/new">
                <PlusCircle className="h-4 w-4" aria-hidden /> 새 포스트 작성
              </Link>
            </li>
            <li>
              <Link className="flex items-center gap-2 hover:text-emerald-200" href="/admin/categories">
                <CalendarCheck2 className="h-4 w-4" aria-hidden /> 카테고리 정리
              </Link>
            </li>
            <li>
              <Link className="flex items-center gap-2 hover:text-emerald-200" href="/admin/tags">
                <Tags className="h-4 w-4" aria-hidden /> 태그 관리
              </Link>
            </li>
          </ul>

          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
            관리자 버전 초기 플랜을 기록하는 영역입니다. 향후 실시간 통계를 연결할 예정이에요.
          </div>
        </div>
      </section>
    </div>
  )
}
