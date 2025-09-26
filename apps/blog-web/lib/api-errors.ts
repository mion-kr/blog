import type { ApiResponse, ErrorResponse } from "@repo/shared"

/**
 * 기본 API 에러 클래스
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * 재인증이 필요한 상황을 표현하는 에러
 */
export class ReauthenticationRequiredError extends ApiError {
  constructor(
    status: number,
    message: string,
    details?: unknown,
    public readonly reason: "SESSION_EXPIRED" | "FORBIDDEN" = "SESSION_EXPIRED"
  ) {
    super(status, "REAUTH_REQUIRED", message, details)
    this.name = "ReauthenticationRequiredError"
  }
}

/**
 * API 응답이 재인증이 필요한 상태인지 판별
 */
function isErrorPayload<T>(response: ApiResponse<T>): response is ErrorResponse {
  return response.success === false
}

export function isReauthenticationResponse<T>(
  response: ApiResponse<T>,
  status: number
): boolean {
  if (status === 401 || status === 403) {
    return true
  }

  if (isErrorPayload(response)) {
    return response.error.code === "UNAUTHORIZED"
  }

  return false
}

/**
 * 에러 객체가 재인증 요구인지 확인
 */
export function isReauthenticationError(
  error: unknown
): error is ReauthenticationRequiredError {
  return error instanceof ReauthenticationRequiredError
}
