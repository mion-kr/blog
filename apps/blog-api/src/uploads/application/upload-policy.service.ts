import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';

import type { PreSignedUploadRequestDto } from '@repo/shared';

import { ObjectStorageService } from '../storage/object-storage.service';

const DEFAULT_EXPIRES_IN = 300;
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

/**
 * 업로드 정책을 관리하는 서비스입니다.
 */
@Injectable()
export class UploadPolicyService {
  private readonly allowedMimeTypes: Set<string>;
  private readonly maxFileSize: number;
  private readonly expiresIn: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly objectStorageService: ObjectStorageService,
  ) {
    this.allowedMimeTypes = new Set(
      (this.configService.get<string>('UPLOAD_ALLOWED_MIME') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    );
    const configuredMaxFileSize = Number(
      this.configService.get<string>('UPLOAD_MAX_SIZE') ?? DEFAULT_MAX_SIZE,
    );
    this.maxFileSize =
      Number.isNaN(configuredMaxFileSize) || configuredMaxFileSize <= 0
        ? DEFAULT_MAX_SIZE
        : configuredMaxFileSize;
    this.expiresIn = DEFAULT_EXPIRES_IN;
  }

  /**
   * 업로드 입력을 검증합니다.
   */
  validateFile(mimeType: string, size: number): void {
    if (this.allowedMimeTypes.size > 0 && !this.allowedMimeTypes.has(mimeType)) {
      throw new BadRequestException(
        `지원하지 않는 파일 형식이에요. (${Array.from(
          this.allowedMimeTypes,
        ).join(', ')})`,
      );
    }

    if (size > this.maxFileSize) {
      throw new BadRequestException(
        `파일 용량이 너무 커요. 최대 ${(this.maxFileSize / (1024 * 1024)).toFixed(1)}MB까지 업로드할 수 있어요.`,
      );
    }
  }

  /**
   * 업로드 객체 키를 생성합니다.
   */
  buildObjectKey(dto: PreSignedUploadRequestDto, timestamp: number): string {
    const extension = this.resolveExtension(dto.filename, dto.mimeType);
    const sanitizedBaseName = this.sanitizeBaseName(dto.filename);
    const basePath = this.objectStorageService.getObjectKeyBasePath();
    const folder = dto.type === 'about' ? 'about' : dto.type;

    return `${basePath}draft/${dto.draftUuid}/${folder}/${timestamp}-${sanitizedBaseName}${extension}`;
  }

  /**
   * pre-signed URL 만료 시간을 반환합니다.
   */
  getExpiresIn(): number {
    return this.expiresIn;
  }

  /**
   * 파일명에서 안전한 base name을 생성합니다.
   */
  private sanitizeBaseName(filename: string): string {
    const baseName = filename.replace(/\.[^/.]+$/, '');
    const normalized = baseName
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();

    return normalized || 'image';
  }

  /**
   * 파일 확장자를 결정합니다.
   */
  private resolveExtension(filename: string, mimeType: string): string {
    const ext = extname(filename).toLowerCase();
    if (ext) {
      return ext;
    }

    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '';
    }
  }
}
