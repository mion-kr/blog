import type { PostResponseDto } from "@repo/shared"

import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { handleServerAuthError } from "@/lib/auth"
import { ReauthenticationRequiredError } from "@/lib/api-errors"

export interface AdminDashboardData {
  publishedTotal: number
  draftTotal: number
  categoryTotal: number
  tagTotal: number
  recentDrafts: PostResponseDto[]
}

interface GetAdminDashboardParams {
  token: string | null
}

/**
 * 관리자 대시보드에 필요한 집계 데이터를 서버에서 조회합니다.
 */
export async function getAdminDashboard({
  token,
}: GetAdminDashboardParams): Promise<{
  data: AdminDashboardData | null
  error: string | null
}> {
  if (!token) {
    return {
      data: null,
      error: "관리자 인증이 필요해요.",
    }
  }

  try {
    const [publishedRes, draftsRes, categoriesRes, tagsRes] = await Promise.all([
      apiClient.posts.getPosts({ limit: 1, published: true }, { token }),
      apiClient.posts.getPosts({ limit: 5, order: "desc", published: false }, { token }),
      apiClient.categories.getCategories({ limit: 1 }, { token }),
      apiClient.tags.getTags({ limit: 1 }, { token }),
    ])

    if (
      !isSuccessResponse(publishedRes) ||
      !isSuccessResponse(draftsRes) ||
      !isSuccessResponse(categoriesRes) ||
      !isSuccessResponse(tagsRes)
    ) {
      return {
        data: null,
        error: "대시보드 데이터를 불러오지 못했어요.",
      }
    }

    return {
      data: {
        publishedTotal: publishedRes.meta?.total ?? publishedRes.data?.length ?? 0,
        draftTotal: draftsRes.meta?.total ?? draftsRes.data?.length ?? 0,
        categoryTotal: categoriesRes.meta?.total ?? categoriesRes.data?.length ?? 0,
        tagTotal: tagsRes.meta?.total ?? tagsRes.data?.length ?? 0,
        recentDrafts: draftsRes.data?.slice(0, 5) ?? [],
      },
      error: null,
    }
  } catch (error) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: "/admin" })
    }

    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "대시보드 데이터를 가져오는 중 오류가 발생했어요.",
    }
  }
}
