import { NextResponse } from "next/server";

import { apiClient, isSuccessResponse } from "@/lib/api-client";
import { ApiError, ReauthenticationRequiredError } from "@/lib/api-errors";
import { getAuthorizationToken } from "@/lib/auth";

export async function GET() {
  const token = await getAuthorizationToken();

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        message: "관리자 인증이 필요해요.",
        error: { code: "UNAUTHORIZED", statusCode: 401 },
      },
      { status: 401 }
    );
  }

  try {
    const [publishedRes, draftsRes, categoriesRes, tagsRes] = await Promise.all(
      [
        apiClient.posts.getPosts({ limit: 1, published: true }, { token }),
        apiClient.posts.getPosts(
          { limit: 5, order: "desc", published: false },
          { token }
        ),
        apiClient.categories.getCategories({ limit: 1 }, { token }),
        apiClient.tags.getTags({ limit: 1 }, { token }),
      ]
    );

    if (
      !publishedRes ||
      !draftsRes ||
      !categoriesRes ||
      !tagsRes ||
      !isSuccessResponse(publishedRes) ||
      !isSuccessResponse(draftsRes) ||
      !isSuccessResponse(categoriesRes) ||
      !isSuccessResponse(tagsRes)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "대시보드 데이터를 불러올 수 없어요.",
        },
        { status: 500 }
      );
    }

    const recentDrafts = draftsRes.data?.slice(0, 5) ?? [];

    return NextResponse.json(
      {
        success: true,
        data: {
          publishedTotal:
            publishedRes.meta?.total ?? publishedRes.data?.length ?? 0,
          draftTotal: draftsRes.meta?.total ?? draftsRes.data?.length ?? 0,
          categoryTotal:
            categoriesRes.meta?.total ?? categoriesRes.data?.length ?? 0,
          tagTotal: tagsRes.meta?.total ?? tagsRes.data?.length ?? 0,
          recentDrafts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ReauthenticationRequiredError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: { code: error.code, statusCode: error.status },
        },
        { status: error.status }
      );
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          error: {
            code: error.code,
            statusCode: error.status,
            details: error.details,
          },
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "대시보드 데이터를 가져오는 중 오류가 발생했어요.",
        error: { code: "UNKNOWN_ERROR", statusCode: 500 },
      },
      { status: 500 }
    );
  }
}
