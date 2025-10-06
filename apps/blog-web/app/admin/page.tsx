import Link from "next/link"
import { CalendarCheck2, FileText, Loader2, Pencil, PlusCircle, Sparkles, Tags } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { apiClient } from "@/lib/api-client"
import { getAuthorizationToken, getSession } from "@/lib/auth"

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

export default async function AdminDashboardPage() {
  const token = await getAuthorizationToken()
  const session = await getSession()

  const [publishedRes, draftsRes, categoriesRes, tagsRes] = await Promise.all([
    apiClient.posts.getPosts({ limit: 1, published: true }),
    token
      ? apiClient.posts.getPosts({ limit: 5, order: 'desc', published: false }, { token })
      : Promise.resolve(null),
    apiClient.categories.getCategories({ limit: 1 }),
    apiClient.tags.getTags({ limit: 1 }),
  ])

  const publishedTotal = publishedRes?.meta?.total ?? 0
  const draftTotal = draftsRes?.meta?.total ?? 0
  const categoryTotal = categoriesRes?.meta?.total ?? categoriesRes?.data?.length ?? 0
  const tagTotal = tagsRes?.meta?.total ?? tagsRes?.data?.length ?? 0

  const recentDrafts = draftsRes?.data?.slice(0, 5) ?? []

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-950 p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-50">
              어서 오세요, {session?.user?.name ?? '관리자'}님!
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
          value={publishedTotal}
          description="공개 상태인 게시글"
          icon={Sparkles}
        />
        <StatCard
          title="작성 중 초안"
          value={draftTotal}
          description="곧 발행될 준비 중인 콘텐츠"
          icon={Pencil}
        />
        <StatCard
          title="카테고리"
          value={categoryTotal}
          description="콘텐츠 분류"
          icon={CalendarCheck2}
        />
        <StatCard
          title="태그"
          value={tagTotal}
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
            {draftsRes === null ? (
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                초안 목록을 불러오려면 관리자 토큰이 필요해요.
              </div>
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
                      마지막 수정: {new Date(draft.updatedAt).toLocaleString('ko-KR', { hour12: false })}
                    </p>
                  </div>
                  <Link
                    href={`/admin/posts/${draft.slug}/edit`}
                    className="text-xs text-emerald-300 transition hover:text-emerald-200"
                  >
                    편집
                  </Link>
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
