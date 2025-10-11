import type {
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
} from "@repo/shared"

import { ensureAuthToken, request, type ApiRequestOptions } from "./base-client"

export const uploadsApi = {
  async createPreSignedUpload<T = PreSignedUploadResponseDto>(
    payload: PreSignedUploadRequestDto,
    options: ApiRequestOptions,
  ) {
    ensureAuthToken(options.token, "POST /api/uploads/pre-signed")
    return request<T>("/api/uploads/pre-signed", {
      ...options,
      method: "POST",
      body: payload,
    })
  },
}
