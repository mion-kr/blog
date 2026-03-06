import type { Tag, TagsQuery } from "@repo/shared"

import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { handleServerAuthError } from "@/lib/auth"
import { ReauthenticationRequiredError } from "@/lib/api-errors"

export interface AdminTagsSearchParams {
  page?: string
  search?: string
}

export interface AdminTagsData {
  tags: Tag[]
  total: number
  query: TagsQuery
}

interface GetAdminTagsParams {
  searchParams?: AdminTagsSearchParams
  token: string | null
}

/**
 * 관리자 태그 목록 화면에 필요한 데이터를 서버에서 조회합니다.
 */
export async function getAdminTags({
  searchParams,
  token,
}: GetAdminTagsParams): Promise<{
  data: AdminTagsData | null
  error: string | null
}> {
  if (!token) {
    return {
      data: null,
      error: "관리자 인증이 필요해요.",
    }
  }

  const resolved = searchParams ?? {}
  const page = Number(resolved.page ?? "1")
  const search = resolved.search?.trim()
  const query: TagsQuery = {
    page: Number.isNaN(page) ? 1 : page,
    limit: 30,
    order: "asc",
    sort: "name",
    search: search || undefined,
  }

  try {
    const response = await apiClient.tags.getTags(query, { token })

    if (!isSuccessResponse(response)) {
      return {
        data: null,
        error: "태그 목록을 불러오지 못했어요.",
      }
    }

    return {
      data: {
        tags: response.data ?? [],
        total: response.meta?.total ?? response.data?.length ?? 0,
        query,
      },
      error: null,
    }
  } catch (error) {
    if (error instanceof ReauthenticationRequiredError) {
      handleServerAuthError(error, { returnTo: "/admin/tags" })
    }

    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "태그를 가져오는 중 오류가 발생했어요.",
    }
  }
}
