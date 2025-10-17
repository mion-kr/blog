import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import type {
  PreSignedUploadRequestDto as SharedPreSignedUploadRequestDto,
  PreSignedUploadResponseDto as SharedPreSignedUploadResponseDto,
  UploadType,
} from '@repo/shared';

export class PreSignedUploadRequestDto
  implements SharedPreSignedUploadRequestDto
{
  @ApiProperty({
    description: '원본 파일명',
    example: 'thumbnail.png',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @ApiProperty({
    description: '파일 MIME 타입',
    example: 'image/png',
  })
  @IsString()
  @MinLength(1)
  mimeType!: string;

  @ApiProperty({
    description: '파일 크기 (bytes)',
    example: 204800,
  })
  @IsNumber()
  @IsPositive()
  size!: number;

  @ApiProperty({
    description: 'Draft UUID (UUIDv7)',
    example: '018f1aeb-4b58-79f7-b555-725f0c602114',
    format: 'uuidv7',
  })
  @IsString()
  @IsUUID('7', { message: 'draftUuid는 UUIDv7 형식이어야 합니다.' })
  draftUuid!: string;

  @ApiProperty({
    description: '업로드 타입',
    enum: ['thumbnail', 'content', 'about'],
    example: 'thumbnail',
  })
  @IsIn(['thumbnail', 'content', 'about'])
  type!: UploadType;
}

export class PreSignedUploadResponseDto
  implements SharedPreSignedUploadResponseDto
{
  @ApiProperty({
    description: 'MinIO에 PUT 요청을 보낼 수 있는 pre-signed URL',
    example:
      'https://bucket-production-d421.up.railway.app:443/development/draft/018f1aeb/thumbnail/1728361923-cover.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&....',
  })
  uploadUrl!: string;

  @ApiProperty({
    description: 'MinIO 객체 키 (S3 object key)',
    example: 'development/draft/018f1aeb/thumbnail/1728361923-cover.png',
  })
  objectKey!: string;

  @ApiProperty({
    description: '공개 접근 가능한 URL (MinIO public endpoint 기준)',
    example:
      'https://bucket-production-d421.up.railway.app:443/development/draft/018f1aeb/thumbnail/1728361923-cover.png',
  })
  publicUrl!: string;

  @ApiProperty({
    description: 'URL 만료까지 남은 시간(초)',
    example: 300,
    default: 300,
  })
  expiresIn!: number;
}
