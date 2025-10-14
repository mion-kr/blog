import { NextRequest, NextResponse } from "next/server"

import type { TagsQuery } from "@repo/shared"

import { apiClient, isSuccessResponse } from "@/lib/api-client"
import { getAuthorizationToken } from "@/lib/auth"
import { ApiError, ReauthenticationRequiredError } from "@/lib/api-errors"

function buildTagsQuery(searchParams: URLSearchParams): TagsQuery {
  const page = Number(searchParams.get("page") ?? "1")
  const search = searchParams.get("search")?.trim()

  return {
    page: Number.isNaN(page) ? 1 : page,
    limit: Number(searchParams.get("limit") ?? "30") || 30,
    order: (searchParams.get("order") as "asc" | "desc") ?? "asc",
    sort: (searchParams.get("sort") as TagsQuery["sort"]) ?? "name",
    search: search ? search : undefined,
  }
}

export async function GET(request: NextRequest) {
  const token = await getAuthorizationToken()

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "관리자 인증이 필요해요.",
        error: { code: "UNAUTHORIZED", statusCode: 401 },
      },
      { status: 401 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = buildTagsQuery(searchParams)

    const response = await apiClient.tags.getTags(query, { token })

    if (!response || !isSuccessResponse(response)) {
      return NextResponse.json(
        {
          success: false,
          message: "태그 목록을 불러올 수 없어요.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          tags: response.data ?? [],
          total: response.meta?.total ?? response.data?.length ?? 0,
          query,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof ReauthenticationRequiredError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code, statusCode: error.status },
        },
        { status: error.status },
      )
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code, statusCode: error.status, details: error.details },
        },
        { status: error.status || 500 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        message: "태그를 가져오는 중 오류가 발생했어요.",
        error: { code: "UNKNOWN_ERROR", statusCode: 500 },
      },
      { status: 500 },
    )
  }
}
