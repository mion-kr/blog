import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import type {
  PreSignedUploadRequestDto,
  PreSignedUploadResponseDto,
  UploadType,
} from '@repo/shared';

import {
  ContentImageFinalizer,
  FinalizePostContentImagesReport,
} from './application/content-image-finalizer';
import { UploadPolicyService } from './application/upload-policy.service';
import { ObjectStorageService } from './storage/object-storage.service';

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

/**
 * 업로드 use-case facade 서비스입니다.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly objectStorageService: ObjectStorageService,
    private readonly uploadPolicyService: UploadPolicyService,
    private readonly contentImageFinalizer: ContentImageFinalizer,
  ) {}

  /**
   * pre-signed 업로드 URL을 생성합니다.
   */
  async createPreSignedUrl(
    dto: PreSignedUploadRequestDto,
  ): Promise<PreSignedUploadResponseDto> {
    this.uploadPolicyService.validateFile(dto.mimeType, dto.size);
    const timestamp = Date.now();
    const objectKey = this.uploadPolicyService.buildObjectKey(dto, timestamp);
    const expiresIn = this.uploadPolicyService.getExpiresIn();
    const uploadUrl = await this.objectStorageService.createSignedUploadUrl({
      objectKey,
      mimeType: dto.mimeType,
      size: dto.size,
      expiresIn,
    });

    return {
      uploadUrl,
      objectKey,
      publicUrl: this.objectStorageService.buildPublicUrl(objectKey),
      expiresIn,
    };
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

    const basePath = this.objectStorageService.getObjectKeyBasePath();
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

    // 확정 경로로 복사한 뒤, 옵션에 따라 draft 원본 삭제를 제어합니다.
    await this.objectStorageService.copyObject(objectKey, destinationKey);
    if (deleteDraftSource) {
      await this.objectStorageService.deleteObject(objectKey, 'draft');
    }

    const previousObjectKey =
      this.objectStorageService.extractObjectKeyFromUrl(currentCoverImage);
    if (removePrevious && previousObjectKey && previousObjectKey !== destinationKey) {
      await this.objectStorageService.deleteObject(previousObjectKey, 'previous');
    }

    return this.objectStorageService.buildPublicUrl(destinationKey);
  }

  /**
   * 포스트 본문의 draft 콘텐츠 이미지를 posts 경로로 확정하고, 제거된 기존 이미지를 정리합니다.
   */
  async finalizePostContentImages(
    options: FinalizePostContentImagesOptions,
  ): Promise<string> {
    const report =
      await this.contentImageFinalizer.finalizePostContentImagesWithReport(
        options,
      );

    return report.content;
  }

  /**
   * 포스트 본문 이미지를 확정하고, 치환된 본문 문자열과 이동된 객체 목록을 함께 반환합니다.
   */
  async finalizePostContentImagesWithReport(
    options: FinalizePostContentImagesOptions,
  ): Promise<FinalizePostContentImagesReport> {
    return this.contentImageFinalizer.finalizePostContentImagesWithReport(options);
  }

  /**
   * 포스트 수정 DB 반영 이후, 본문에서 제거된 기존 content 이미지를 정리합니다.
   */
  async cleanupRemovedPostContentImages(options: {
    postId: string;
    previousContent?: string | null;
    nextContent?: string | null;
  }): Promise<void> {
    await this.contentImageFinalizer.cleanupRemovedPostContentImages(options);
  }

  /**
   * 객체 키 목록을 best-effort로 삭제합니다. 개별 삭제 실패는 경고 로그만 남기고 계속 진행합니다.
   */
  async deleteObjectsByKeys(objectKeys: string[]): Promise<void> {
    await this.objectStorageService.deleteObjects(objectKeys, 'bulk-cleanup');
  }

  /**
   * About 이미지 draft URL을 최종 경로로 확정합니다.
   */
  async finalizeAboutImage(tempPublicUrl: string): Promise<string> {
    const objectKey = this.objectStorageService.extractObjectKeyFromUrl(tempPublicUrl);

    if (!objectKey) {
      this.logger.warn('About 이미지 URL에서 objectKey를 추출할 수 없습니다.', {
        tempPublicUrl,
      });
      throw new BadRequestException('잘못된 업로드 URL입니다.');
    }

    const basePath = this.objectStorageService.getObjectKeyBasePath();
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

    await this.objectStorageService.copyObject(objectKey, destinationKey);
    await this.objectStorageService.deleteObject(objectKey, 'about-draft');

    return this.objectStorageService.buildPublicUrl(destinationKey);
  }

  /**
   * public URL 기준으로 객체를 삭제합니다.
   */
  async deleteObjectByUrl(publicUrl?: string | null): Promise<void> {
    if (!publicUrl) {
      return;
    }

    const objectKey = this.objectStorageService.extractObjectKeyFromUrl(publicUrl);
    if (!objectKey) {
      return;
    }

    await this.objectStorageService.deleteObject(objectKey, 'about-remove');
  }
}
