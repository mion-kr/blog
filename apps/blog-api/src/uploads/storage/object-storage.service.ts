import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { S3_CLIENT_TOKEN } from '../uploads.constants';

/**
 * 오브젝트 스토리지 adapter 입니다.
 */
@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly bucket: string;
  private readonly publicEndpoint: string;
  private readonly objectKeyPrefix: string;

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
    this.objectKeyPrefix = this.resolveObjectKeyPrefix(
      this.bucket,
      this.configService.get<string>('NODE_ENV'),
    );
  }

  /**
   * PUT 업로드용 pre-signed URL을 생성합니다.
   */
  async createSignedUploadUrl(options: {
    objectKey: string;
    mimeType: string;
    size: number;
    expiresIn: number;
  }): Promise<string> {
    const { objectKey, mimeType, size, expiresIn } = options;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      ContentType: mimeType,
      ContentLength: size,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error('Pre-signed URL 생성에 실패했어요.', error as Error, {
        objectKey,
        mimeType,
      });
      throw new InternalServerErrorException(
        '파일 업로드 URL을 생성하는 중 오류가 발생했습니다.',
      );
    }
  }

  /**
   * 객체를 다른 경로로 복사합니다.
   */
  async copyObject(sourceKey: string, destinationKey: string): Promise<void> {
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

  /**
   * 객체를 best-effort로 삭제합니다.
   */
  async deleteObject(key: string, context: string): Promise<void> {
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
      // 삭제 실패는 치명적이지 않으므로 경고만 남깁니다.
    }
  }

  /**
   * 객체 키 목록을 best-effort로 삭제합니다.
   */
  async deleteObjects(keys: string[], context: string): Promise<void> {
    const uniqueKeys = Array.from(new Set(keys.filter((key) => key.length > 0)));

    // 중복 키를 제거한 뒤 순차 삭제해 로그 맥락을 단순하게 유지합니다.
    for (const key of uniqueKeys) {
      await this.deleteObject(key, context);
    }
  }

  /**
   * 객체 키를 public URL로 변환합니다.
   */
  buildPublicUrl(objectKey: string): string {
    return `${this.getPublicUrlBasePath()}${objectKey}`;
  }

  /**
   * public URL에서 객체 키를 추출합니다.
   */
  extractObjectKeyFromUrl(publicUrl?: string | null): string | null {
    if (!publicUrl) {
      return null;
    }

    // URL query/hash가 포함되어도 객체 키 비교가 가능하도록 본문 URL을 정규화합니다.
    const normalizedUrl = publicUrl.split(/[?#]/)[0] ?? publicUrl;
    const publicBasePath = this.getPublicUrlBasePath();
    if (!normalizedUrl.startsWith(publicBasePath)) {
      return null;
    }

    return normalizedUrl.substring(publicBasePath.length);
  }

  /**
   * 객체 키 공통 prefix 경로를 반환합니다.
   */
  getObjectKeyBasePath(): string {
    return this.objectKeyPrefix.length > 0 ? `${this.objectKeyPrefix}/` : '';
  }

  /**
   * public URL 공통 prefix 경로를 반환합니다.
   */
  getPublicUrlBasePath(): string {
    return `${this.publicEndpoint}/${this.bucket}/`;
  }

  /**
   * 필수 환경 변수를 조회합니다.
   */
  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} 환경 변수가 필요합니다.`);
    }

    return value;
  }

  /**
   * 허용된 버킷 이름인지 검증합니다.
   */
  private assertSupportedBucketName(bucket: string): void {
    const normalized = bucket.trim().toLowerCase();
    if (normalized !== 'development' && normalized !== 'production') {
      throw new Error(
        'MINIO_BUCKET 값이 올바르지 않습니다. development 또는 production만 사용할 수 있습니다.',
      );
    }
  }

  /**
   * 객체 키 prefix를 계산합니다.
   */
  private resolveObjectKeyPrefix(bucket: string, nodeEnv?: string): string {
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
}
