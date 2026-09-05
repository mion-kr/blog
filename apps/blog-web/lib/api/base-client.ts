import 'server-only';

import { getCallerHeaders, resolveBackendUrl } from './caller-auth';
import {
  ApiError,
  ReauthenticationRequiredError,
  isReauthenticationResponse,
} from "../api-errors";

import type { ApiResponse } from "@repo/shared";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

export async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", headers = {}, body, token } = options;

  const url = resolveBackendUrl(endpoint);

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...Object.fromEntries(Object.entries(headers).filter(([name]) =>
      !['authorization', 'x-mion-caller-oidc', 'x-mion-local-caller'].includes(name.toLowerCase()),
    )),
    ...await getCallerHeaders(),
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
    redirect: 'error',
    cache: 'no-store',
  };

  if (body !== undefined && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);
    const hasBody = response.status !== 204;
    const contentType = response.headers.get("content-type") ?? "";

    let data: ApiResponse<T> | undefined;

    if (hasBody && contentType.includes("application/json")) {
      data = (await response.json()) as ApiResponse<T>;
    } else if (hasBody) {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text) as ApiResponse<T>;
      }
    }

    if (!data) {
      data = response.ok
        ? {
            success: true,
            message: "요청이 성공했어요.",
            timestamp: new Date().toISOString(),
            path: endpoint,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: undefined as any,
          }
        : {
            success: false,
            message: "서버 응답이 비어 있습니다.",
            timestamp: new Date().toISOString(),
            path: endpoint,
            error: {
              code: "UNKNOWN_ERROR",
              statusCode: response.status,
            },
          };
    }

    if (!response.ok) {
      const errorData = data as ApiResponse<unknown>;
      const isError = isErrorResponse(errorData);

      if (isReauthenticationResponse(errorData, response.status)) {
        throw new ReauthenticationRequiredError(
          response.status,
          errorData.message ?? "세션이 만료되었어요. 다시 로그인해 주세요.",
          isError ? errorData.error.details : undefined,
          response.status === 403 ? "FORBIDDEN" : "SESSION_EXPIRED",
        );
      }

      throw new ApiError(
        response.status,
        isError ? errorData.error.code : "UNKNOWN_ERROR",
        errorData.message ?? "An error occurred",
        isError ? errorData.error.details : undefined,
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
    );
  }
}

export function ensureAuthToken(
  token: string | undefined,
  context: string,
): asserts token {
  if (!token) {
    throw new ApiError(
      401,
      "MISSING_TOKEN",
      `${context} 호출에 인증 토큰이 필요합니다.`,
    );
  }
}

export function buildQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

export function isSuccessResponse<T>(
  response: ApiResponse<T>,
): response is ApiResponse<T> & { success: true } {
  return response.success === true;
}

export function isErrorResponse<T>(
  response: ApiResponse<T>,
): response is ApiResponse<T> & { success: false } {
  return response.success === false;
}
