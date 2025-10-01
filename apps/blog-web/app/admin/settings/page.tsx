import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"

import { getAuthorizationToken, getSession } from "@/lib/auth"
import { apiClient } from "@/lib/api-client"
import { ProfileCard } from "@/components/admin/settings/profile-card"
import { BlogInfoForm } from "@/components/admin/settings/blog-info-form"
import { PostSettingsForm } from "@/components/admin/settings/post-settings-form"
import {
  updateAdminBlogInfoAction,
  updateAdminPostSettingsAction,
} from "@/lib/admin/settings-actions"

export default async function AdminSettingsPage() {
  const session = await getSession()
  const token = await getAuthorizationToken()

  if (!session?.user) {
    redirect("/api/auth/signin")
  }

  if (!token) {
    redirect("/api/auth/signin")
  }

  // 설정 조회
  const settingsRes = await apiClient.settings.getSettings({ token })

  if (!settingsRes.success || !settingsRes.data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            관리자 콘솔로 돌아가기
          </Link>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-red-200">설정을 불러올 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const settings = settingsRes.data

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          관리자 콘솔로 돌아가기
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-slate-50">설정</h1>
        <p className="mt-2 text-sm text-slate-400">블로그 설정을 관리하세요.</p>
      </div>

      {/* 프로필 정보 (읽기 전용) */}
      <ProfileCard
        name={session.user.name ?? "사용자"}
        email={session.user.email ?? ""}
        image={session.user.image}
        role={session.user.role ?? "USER"}
      />

      {/* 블로그 기본 정보 */}
      <BlogInfoForm
        action={updateAdminBlogInfoAction}
        initialData={{
          siteTitle: settings.siteTitle,
          siteDescription: settings.siteDescription,
          siteUrl: settings.siteUrl,
        }}
      />

      {/* 포스트 기본 설정 */}
      <PostSettingsForm
        action={updateAdminPostSettingsAction}
        initialData={{
          postsPerPage: settings.postsPerPage,
        }}
      />
    </div>
  )
}
