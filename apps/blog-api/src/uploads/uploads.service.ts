import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'node:path';

import type {
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
  UploadType,
} from '@repo/shared';

import { S3_CLIENT_TOKEN } from './uploads.constants';

const DEFAULT_EXPIRES_IN = 300; // 5 minutes
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MiB

interface FinalizeCoverImageOptions {
  postId: string;
  draftUuid?: string;
  objectKey?: string;
  type: UploadType;
  currentCoverImage?: string | null;
  deleteDraftSource?: boolean;
  removePrevious?: boolean;
}

interface FinalizePostContentImagesOptions {
  postId: string;
  draftUuid?: string;
  nextContent?: string | null;
  previousContent?: string | null;
  deleteDraftSource?: boolean;
  removeOrphanedPrevious?: boolean;
}

interface MovedObjectRecord {
  sourceKey: string;
  destinationKey: string;
}

interface FinalizePostContentImagesReport {
  content: string;
  movedObjects: MovedObjectRecord[];
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly bucket: string;
  private readonly publicEndpoint: string;
  private readonly allowedMimeTypes: Set<string>;
  private readonly maxFileSize: number;
  private readonly objectKeyPrefix: string;
  private readonly expiresIn: number;

  constructor(
    @Inject(S3_CLIENT_TOKEN) private readonly s3Client: S3Client,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.getRequiredConfig('MINIO_BUCKET');
    this.assertSupportedBucketName(this.bucket);
    this.publicEndpoint = this.getRequiredConfig('MINIO_PUBLIC_ENDPOINT').replace(
      /\/$/,
      '',
    );
    this.allowedMimeTypes = new Set(
      (this.configService.get<string>('UPLOAD_ALLOWED_MIME') ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    );
    this.maxFileSize = Number(
      this.configService.get<string>('UPLOAD_MAX_SIZE') ?? DEFAULT_MAX_SIZE,
    );
    if (Number.isNaN(this.maxFileSize) || this.maxFileSize <= 0) {
      this.maxFileSize = DEFAULT_MAX_SIZE;
    }

    this.objectKeyPrefix = this.resolveObjectKeyPrefix(
      this.bucket,
      this.configService.get<string>('NODE_ENV'),
    );

    this.expiresIn = DEFAULT_EXPIRES_IN;
  }

  async createPreSignedUrl(
    dto: PreSignedUploadRequestDto,
  ): Promise<PreSignedUploadResponseDto> {
    this.validateFile(dto.mimeType, dto.size);

    const extension = this.resolveExtension(dto.filename, dto.mimeType);
    const sanitizedBaseName = this.sanitizeBaseName(dto.filename);
    const timestamp = Date.now();

    const objectKey = this.buildObjectKey(dto, timestamp, sanitizedBaseName, extension);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.size,
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.expiresIn,
      });

      return {
        uploadUrl,
        objectKey,
        publicUrl: this.buildPublicUrl(objectKey),
        expiresIn: this.expiresIn,
      };
    } catch (error) {
      this.logger.error('Pre-signed URL 생성에 실패했어요.', error as Error, {
        draftUuid: dto.draftUuid,
        mimeType: dto.mimeType,
      });
      throw new InternalServerErrorException(
        '파일 업로드 URL을 생성하는 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 커버 이미지를 draft 경로에서 posts 경로로 확정하고, 필요 시 기존 커버 이미지를 정리합니다.
   */
  async finalizeCoverImage(
    options: FinalizeCoverImageOptions,
  ): Promise<string | null> {
    const {
      draftUuid,
      objectKey,
      postId,
      type,
      currentCoverImage,
      deleteDraftSource = true,
      removePrevious = true,
    } = options;

    if (!draftUuid || !objectKey) {
      return currentCoverImage ?? null;
    }

    const basePath = this.getObjectKeyBasePath();
    const expectedPrefix = `${basePath}draft/${draftUuid}/`;
    if (!objectKey.startsWith(expectedPrefix)) {
      this.logger.warn('draftUuid와 objectKey가 일치하지 않습니다.', {
        draftUuid,
        objectKey,
      });
      throw new BadRequestException('잘못된 업로드 객체 키입니다.');
    }

    const fileName = objectKey.split('/').pop();
    if (!fileName) {
      throw new BadRequestException('유효하지 않은 파일 경로입니다.');
    }

    const destinationKey = `${basePath}posts/${postId}/${type}/${fileName}`;

    // 확정 경로로 복사한 뒤, 옵션에 따라 draft 원본 삭제를 제어한다.
    await this.copyObject(objectKey, destinationKey);
    if (deleteDraftSource) {
      await this.deleteObject(objectKey, 'draft');
    }

    const previousObjectKey = this.extractObjectKeyFromUrl(currentCoverImage);
    if (removePrevious && previousObjectKey && previousObjectKey !== destinationKey) {
      await this.deleteObject(previousObjectKey, 'previous');
    }

    return this.buildPublicUrl(destinationKey);
  }

  /**
   * 포스트 본문의 draft 콘텐츠 이미지를 posts 경로로 확정하고, 제거된 기존 이미지를 정리합니다.
   */
  async finalizePostContentImages(
    options: FinalizePostContentImagesOptions,
  ): Promise<string> {
    const report = await this.finalizePostContentImagesWithReport(options);
    return report.content;
  }

  /**
   * 포스트 본문 이미지를 확정하고, 치환된 본문 문자열과 이동된 객체 목록을 함께 반환합니다.
   */
  async finalizePostContentImagesWithReport(
    options: FinalizePostContentImagesOptions,
  ): Promise<FinalizePostContentImagesReport> {
    const {
      postId,
      draftUuid,
      nextContent,
      previousContent,
      deleteDraftSource = true,
      removeOrphanedPrevious = true,
    } = options;
    let finalizedContent = nextContent ?? '';
    let movedObjects: MovedObjectRecord[] = [];

    // 본문에서 참조하는 draft/content 이미지를 post/content 경로로 이동하고 URL을 치환한다.
    if (draftUuid) {
      const moveResult = await this.moveDraftContentImages({
        postId,
        draftUuid,
        content: finalizedContent,
        deleteDraftSource,
      });
      finalizedContent = moveResult.content;
      movedObjects = moveResult.movedObjects;
    }

    // 수정 시 본문에서 제거된 기존 content 이미지는 옵션에 따라 정리한다.
    if (removeOrphanedPrevious) {
      await this.deleteRemovedPostContentImages({
        postId,
        previousContent: previousContent ?? '',
        nextContent: finalizedContent,
      });
    }

    return {
      content: finalizedContent,
      movedObjects,
    };
  }

  /**
   * 포스트 수정 DB 반영 이후, 본문에서 제거된 기존 content 이미지를 정리합니다.
   */
  async cleanupRemovedPostContentImages(options: {
    postId: string;
    previousContent?: string | null;
    nextContent?: string | null;
  }): Promise<void> {
    const { postId, previousContent, nextContent } = options;

    // DB 반영 완료 이후 호출되는 후처리이므로 삭제 실패는 경고만 남기고 진행한다.
    await this.deleteRemovedPostContentImages({
      postId,
      previousContent: previousContent ?? '',
      nextContent: nextContent ?? '',
    });
  }

  /**
   * 객체 키 목록을 best-effort로 삭제합니다. 개별 삭제 실패는 경고 로그만 남기고 계속 진행합니다.
   */
  async deleteObjectsByKeys(objectKeys: string[]): Promise<void> {
    const uniqueKeys = Array.from(new Set(objectKeys.filter((key) => key.length > 0)));

    // 중복 키를 제거한 뒤 순차 삭제해 로그 맥락을 단순하게 유지한다.
    for (const key of uniqueKeys) {
      await this.deleteObject(key, 'bulk-cleanup');
    }
  }

  async finalizeAboutImage(tempPublicUrl: string): Promise<string> {
    const objectKey = this.extractObjectKeyFromUrl(tempPublicUrl);

    if (!objectKey) {
      this.logger.warn('About 이미지 URL에서 objectKey를 추출할 수 없습니다.', {
        tempPublicUrl,
      });
      throw new BadRequestException('잘못된 업로드 URL입니다.');
    }

    const basePath = this.getObjectKeyBasePath();
    const expectedPrefix = `${basePath}draft/`;

    if (!objectKey.startsWith(expectedPrefix)) {
      this.logger.warn('About 이미지 objectKey가 draft 경로와 일치하지 않습니다.', {
        objectKey,
        tempPublicUrl,
      });
      throw new BadRequestException('잘못된 업로드 객체 키입니다.');
    }

    const relativePath = objectKey.substring(expectedPrefix.length);
    const segments = relativePath.split('/');

    if (segments.length < 3 || segments[1] !== 'about') {
      this.logger.warn('About 이미지 경로가 예상된 구조와 다릅니다.', {
        objectKey,
        tempPublicUrl,
      });
      throw new BadRequestException('잘못된 업로드 객체 키입니다.');
    }

    const fileName = segments[segments.length - 1];
    if (!fileName) {
      throw new BadRequestException('유효하지 않은 파일 경로입니다.');
    }

    const destinationKey = `${basePath}about/${fileName}`;

    await this.copyObject(objectKey, destinationKey);
    await this.deleteObject(objectKey, 'about-draft');

    return this.buildPublicUrl(destinationKey);
  }

  async deleteObjectByUrl(publicUrl?: string | null): Promise<void> {
    if (!publicUrl) {
      return;
    }

    const objectKey = this.extractObjectKeyFromUrl(publicUrl);
    if (!objectKey) {
      return;
    }

    await this.deleteObject(objectKey, 'about-remove');
  }

  /**
   * 본문 문자열에서 draft/content 이미지 객체를 posts/content로 복사 후 URL을 교체합니다.
   */
  private async moveDraftContentImages(options: {
    postId: string;
    draftUuid: string;
    content: string;
    deleteDraftSource: boolean;
  }): Promise<FinalizePostContentImagesReport> {
    const { postId, draftUuid, content, deleteDraftSource } = options;
    const basePath = this.getObjectKeyBasePath();
    const draftPrefix = `${basePath}draft/${draftUuid}/content/`;
    const draftObjectKeys = this.extractObjectKeysByPrefix(content, draftPrefix);
    let nextContent = content;
    const movedObjects: MovedObjectRecord[] = [];

    for (const sourceKey of draftObjectKeys) {
      const fileName = sourceKey.split('/').pop();
      if (!fileName) {
        continue;
      }

      const destinationKey = `${basePath}posts/${postId}/content/${fileName}`;

      await this.copyObject(sourceKey, destinationKey);
      movedObjects.push({ sourceKey, destinationKey });

      // 성공 후 cleanup 시점까지 draft 원본을 보존해야 하면 삭제를 지연한다.
      if (deleteDraftSource) {
        await this.deleteObject(sourceKey, 'content-draft');
      }

      const sourceUrl = this.buildPublicUrl(sourceKey);
      const destinationUrl = this.buildPublicUrl(destinationKey);

      if (sourceUrl !== destinationUrl) {
        nextContent = nextContent.split(sourceUrl).join(destinationUrl);
      }
    }

    return {
      content: nextContent,
      movedObjects,
    };
  }

  /**
   * 수정 전/후 본문을 비교해 posts/content 경로에서 더 이상 참조되지 않는 이미지를 삭제합니다.
   */
  private async deleteRemovedPostContentImages(options: {
    postId: string;
    previousContent: string;
    nextContent: string;
  }): Promise<void> {
    const { postId, previousContent, nextContent } = options;
    const basePath = this.getObjectKeyBasePath();
    const postContentPrefix = `${basePath}posts/${postId}/content/`;
    const previousKeys = this.extractObjectKeysByPrefix(
      previousContent,
      postContentPrefix,
    );
    const nextKeys = this.extractObjectKeysByPrefix(nextContent, postContentPrefix);

    for (const previousKey of previousKeys) {
      if (!nextKeys.has(previousKey)) {
        await this.deleteObject(previousKey, 'content-orphan');
      }
    }
  }

  /**
   * 본문 문자열에서 public endpoint 기준 URL을 추출하고, prefix 조건에 맞는 object key 집합을 반환합니다.
   */
  private extractObjectKeysByPrefix(content: string, prefix: string): Set<string> {
    if (!content) {
      return new Set();
    }

    const publicBasePath = this.getPublicUrlBasePath();
    const escapedPublicBasePath = this.escapeRegExp(publicBasePath);
    const urlPattern = new RegExp(`${escapedPublicBasePath}[^\\s)"'<>]+`, 'g');
    const matches = content.match(urlPattern) ?? [];
    const objectKeys = new Set<string>();

    for (const url of matches) {
      const objectKey = this.extractObjectKeyFromUrl(url);
      if (objectKey && objectKey.startsWith(prefix)) {
        objectKeys.add(objectKey);
      }
    }

    return objectKeys;
  }

  private validateFile(mimeType: string, size: number): void {
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

  private buildPublicUrl(objectKey: string): string {
    return `${this.getPublicUrlBasePath()}${objectKey}`;
  }

  private extractObjectKeyFromUrl(
    publicUrl?: string | null,
  ): string | null {
    if (!publicUrl) {
      return null;
    }

    // URL query/hash가 포함되어도 객체 키 비교가 가능하도록 본문 URL을 정규화한다.
    const normalizedUrl = publicUrl.split(/[?#]/)[0] ?? publicUrl;
    const publicBasePath = this.getPublicUrlBasePath();
    if (!normalizedUrl.startsWith(publicBasePath)) {
      return null;
    }

    return normalizedUrl.substring(publicBasePath.length);
  }

  private async copyObject(
    sourceKey: string,
    destinationKey: string,
  ): Promise<void> {
    try {
      const encodedSourceKey = encodeURIComponent(sourceKey).replace(
        /%2F/g,
        '/',
      );
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          CopySource: `${this.bucket}/${encodedSourceKey}`,
          Key: destinationKey,
        }),
      );
    } catch (error) {
      this.logger.error('MinIO 객체 복사에 실패했어요.', error as Error, {
        sourceKey,
        destinationKey,
      });
      throw new InternalServerErrorException(
        '업로드된 파일을 저장 위치로 이동하는 중 오류가 발생했습니다.',
      );
    }
  }

  private async deleteObject(key: string, context: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.warn('MinIO 객체 삭제에 실패했어요.', {
        key,
        context,
        error,
      });
      // 삭제 실패는 치명적이지 않으므로 예외를 재던지지 않는다.
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} 환경 변수가 필요합니다.`);
    }
    return value;
  }

  private assertSupportedBucketName(bucket: string): void {
    const normalized = bucket.trim().toLowerCase();
    if (normalized !== 'development' && normalized !== 'production') {
      throw new Error(
        'MINIO_BUCKET 값이 올바르지 않습니다. development 또는 production만 사용할 수 있습니다.',
      );
    }
  }

  private resolveObjectKeyPrefix(
    bucket: string,
    nodeEnv?: string,
  ): string {
    const trimmedBucket = bucket.trim();
    const trimmedBucketLower = trimmedBucket.toLowerCase();
    const trimmedEnv = nodeEnv?.trim();

    if (trimmedBucketLower === 'development' || trimmedBucketLower === 'production') {
      return '';
    }

    if (trimmedEnv && trimmedEnv.length > 0) {
      return trimmedEnv.toLowerCase() === 'production' ? 'production' : trimmedEnv;
    }

    return 'development';
  }

  private getObjectKeyBasePath(): string {
    return this.objectKeyPrefix.length > 0 ? `${this.objectKeyPrefix}/` : '';
  }

  private getPublicUrlBasePath(): string {
    return `${this.publicEndpoint}/${this.bucket}/`;
  }

  /**
   * 정규식 문자열 안전화를 위해 특수문자를 이스케이프합니다.
   */
  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private buildObjectKey(
    dto: PreSignedUploadRequestDto,
    timestamp: number,
    sanitizedBaseName: string,
    extension: string,
  ): string {
    const basePath = this.getObjectKeyBasePath();
    const folder = dto.type === 'about' ? 'about' : dto.type;
    return `${basePath}draft/${dto.draftUuid}/${folder}/${timestamp}-${sanitizedBaseName}${extension}`;
  }
}
