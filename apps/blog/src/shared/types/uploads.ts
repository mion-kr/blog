// 업로드 관련 공유 타입 정의

export type UploadType = "thumbnail" | "content" | "about";

export interface PreSignedUploadRequestDto {
  filename: string;
  mimeType: string;
  size: number;
  draftUuid: string;
  type: UploadType;
}

export interface PreSignedUploadResponseDto {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
  expiresIn: number;
}
