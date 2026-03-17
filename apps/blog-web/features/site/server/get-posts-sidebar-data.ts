import type { Category, Tag } from "@repo/shared"

import { apiClient, isSuccessResponse } from "@/lib/api-client"

export interface PostsSidebarData {
  categories: Category[]
  tags: Tag[]
}

/**
 * 공개 posts 화면 사이드바에 필요한 카테고리/태그 데이터를 서버에서 조회합니다.
 */
export async function getPostsSidebarData(): Promise<PostsSidebarData> {
  const [categoriesResult, tagsResult] = await Promise.allSettled([
    apiClient.categories.getCategories({ limit: 50, sort: "postCount", order: "desc" }),
    apiClient.tags.getTags({ limit: 30, sort: "postCount", order: "desc" }),
  ])

  const categories =
    categoriesResult.status === "fulfilled" && isSuccessResponse(categoriesResult.value)
      ? categoriesResult.value.data ?? []
      : []
  const tags =
    tagsResult.status === "fulfilled" && isSuccessResponse(tagsResult.value)
      ? tagsResult.value.data ?? []
      : []

  return { categories, tags }
}
