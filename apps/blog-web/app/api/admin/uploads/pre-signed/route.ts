import { NextRequest, NextResponse } from "next/server"

import type {
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
} from "@repo/shared"

import { apiClient } from "@/lib/api-client"
import { ApiError, ReauthenticationRequiredError } from "@/lib/api-errors"
import { getAuthorizationToken } from "@/lib/auth"

type ErrorBody = {
  success: false
  message: string
  timestamp: string
  path: string
  error: {
    code: string
    statusCode: number
  }
}

const PATH = "/api/admin/uploads/pre-signed"

export async function POST(request: NextRequest) {
  const token = await getAuthorizationToken()
  if (!token) {
    return NextResponse.json<ErrorBody>(
      {
        success: false,
        message: "인증이 필요한 요청이에요.",
        timestamp: new Date().toISOString(),
        path: PATH,
        error: {
          code: "UNAUTHORIZED",
          statusCode: 401,
        },
      },
      { status: 401 },
    )
  }

  let payload: PreSignedUploadRequestDto

  try {
    payload = (await request.json()) as PreSignedUploadRequestDto
  } catch {
    return NextResponse.json<ErrorBody>(
      {
        success: false,
        message: "요청 본문이 올바르지 않아요.",
        timestamp: new Date().toISOString(),
        path: PATH,
        error: {
          code: "INVALID_PAYLOAD",
          statusCode: 400,
        },
      },
      { status: 400 },
    )
  }

  try {
    const response =
      await apiClient.uploads.createPreSignedUpload<PreSignedUploadResponseDto>(
        payload,
        { token },
      )
    const status = response.success ? 200 : response.error?.statusCode ?? 500
    return NextResponse.json(response, { status })
  } catch (error) {
    if (error instanceof ReauthenticationRequiredError) {
      return NextResponse.json<ErrorBody>(
        {
          success: false,
          message: error.message ?? "세션이 만료되었어요.",
          timestamp: new Date().toISOString(),
          path: PATH,
          error: {
            code: error.reason ?? "SESSION_EXPIRED",
            statusCode: 401,
          },
        },
        { status: 401 },
      )
    }

    if (error instanceof ApiError) {
      return NextResponse.json<ErrorBody>(
        {
          success: false,
          message: error.message,
          timestamp: new Date().toISOString(),
          path: PATH,
          error: {
            code: error.code,
            statusCode: error.status,
          },
        },
        { status: error.status || 500 },
      )
    }

    console.error("Pre-signed URL proxy error:", error)

    return NextResponse.json<ErrorBody>(
      {
        success: false,
        message: "파일 업로드 URL을 생성하는 중 알 수 없는 오류가 발생했습니다.",
        timestamp: new Date().toISOString(),
        path: PATH,
        error: {
          code: "UNEXPECTED_ERROR",
          statusCode: 500,
        },
      },
      { status: 500 },
    )
  }
}
