"use client"

import type {
  ApiResponse,
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
} from "@repo/shared"

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * 바이트 값을 업로드 안내용 사람이 읽기 쉬운 문자열로 변환합니다.
 */
export function formatUploadFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * 브라우저 이미지 업로드 전에 MIME 타입과 파일 크기를 검증합니다.
 */
export function validateUploadableImage(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return "지원하지 않는 파일 형식입니다. JPEG, PNG, WEBP만 업로드할 수 있어요."
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return `파일 용량이 너무 커요. 최대 ${formatUploadFileSize(MAX_IMAGE_FILE_SIZE)}까지 가능합니다.`
  }

  return null
}

/**
 * 업로드용 pre-signed URL을 발급받고 실제 파일 업로드까지 완료합니다.
 */
export async function uploadImageFromBrowser(
  payload: PreSignedUploadRequestDto,
  file: File,
): Promise<PreSignedUploadResponseDto> {
  const uploadInfo = await requestPreSignedUpload(payload)

  await uploadFileToSignedUrl(uploadInfo.uploadUrl, file)

  return uploadInfo
}

/**
 * Next route handler를 통해 pre-signed URL 발급 계약을 호출합니다.
 */
async function requestPreSignedUpload(
  payload: PreSignedUploadRequestDto,
): Promise<PreSignedUploadResponseDto> {
  const response = await fetch("/api/admin/uploads/pre-signed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const data = (await response.json()) as ApiResponse<PreSignedUploadResponseDto>

  if (!response.ok || !data.success || !data.data) {
    throw new Error(data.message ?? "업로드 URL을 발급받지 못했어요.")
  }

  return data.data
}

/**
 * 발급받은 pre-signed URL로 브라우저에서 파일 바이너리를 전송합니다.
 */
async function uploadFileToSignedUrl(uploadUrl: string, file: File): Promise<void> {
  const result = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  })

  if (!result.ok) {
    throw new Error("MinIO에 파일을 업로드하지 못했어요.")
  }
}
