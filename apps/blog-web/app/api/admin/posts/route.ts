import { NextRequest, NextResponse } from "next/server"

import { getAuthorizationToken } from "@/lib/auth"
import { ApiError, ReauthenticationRequiredError } from "@/lib/api-errors"
import { getAdminPosts } from "@/features/posts/server/get-admin-posts"

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
    const result = await getAdminPosts({
      searchParams: {
        page: searchParams.get("page") ?? undefined,
        search: searchParams.get("search") ?? undefined,
        published: searchParams.get("published") ?? undefined,
      },
      token,
    })

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "포스트 목록을 불러오지 못했어요.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          posts: result.posts,
          total: result.total,
          postsPerPage: result.postsPerPage,
          query: result.query,
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
        message: "포스트 목록을 가져오는 중 오류가 발생했어요.",
        error: { code: "UNKNOWN_ERROR", statusCode: 500 },
      },
      { status: 500 },
    )
  }
}
