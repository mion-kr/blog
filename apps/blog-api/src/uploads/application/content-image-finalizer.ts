import { Injectable } from '@nestjs/common';

import { ObjectStorageService } from '../storage/object-storage.service';

/**
 * 이동된 객체 정보를 표현합니다.
 */
export interface MovedObjectRecord {
  sourceKey: string;
  destinationKey: string;
}

/**
 * 본문 이미지 확정 결과를 표현합니다.
 */
export interface FinalizePostContentImagesReport {
  content: string;
  movedObjects: MovedObjectRecord[];
}

/**
 * 본문 이미지 확정과 정리를 처리하는 서비스입니다.
 */
@Injectable()
export class ContentImageFinalizer {
  constructor(private readonly objectStorageService: ObjectStorageService) {}

  /**
   * 본문 이미지를 draft 경로에서 posts 경로로 확정합니다.
   */
  async finalizePostContentImagesWithReport(options: {
    postId: string;
    draftUuid?: string;
    nextContent?: string | null;
    previousContent?: string | null;
    deleteDraftSource?: boolean;
    removeOrphanedPrevious?: boolean;
  }): Promise<FinalizePostContentImagesReport> {
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

    // 본문에서 참조하는 draft/content 이미지를 post/content 경로로 이동하고 URL을 치환합니다.
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

    // 수정 시 본문에서 제거된 기존 content 이미지는 옵션에 따라 정리합니다.
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
   * DB 반영 이후 제거된 본문 이미지를 정리합니다.
   */
  async cleanupRemovedPostContentImages(options: {
    postId: string;
    previousContent?: string | null;
    nextContent?: string | null;
  }): Promise<void> {
    const { postId, previousContent, nextContent } = options;

    // DB 반영 완료 이후 호출되는 후처리이므로 삭제 실패는 경고만 남기고 진행합니다.
    await this.deleteRemovedPostContentImages({
      postId,
      previousContent: previousContent ?? '',
      nextContent: nextContent ?? '',
    });
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
    const basePath = this.objectStorageService.getObjectKeyBasePath();
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

      await this.objectStorageService.copyObject(sourceKey, destinationKey);
      movedObjects.push({ sourceKey, destinationKey });

      // 성공 후 cleanup 시점까지 draft 원본을 보존해야 하면 삭제를 지연합니다.
      if (deleteDraftSource) {
        await this.objectStorageService.deleteObject(sourceKey, 'content-draft');
      }

      const sourceUrl = this.objectStorageService.buildPublicUrl(sourceKey);
      const destinationUrl = this.objectStorageService.buildPublicUrl(destinationKey);

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
    const basePath = this.objectStorageService.getObjectKeyBasePath();
    const postContentPrefix = `${basePath}posts/${postId}/content/`;
    const previousKeys = this.extractObjectKeysByPrefix(
      previousContent,
      postContentPrefix,
    );
    const nextKeys = this.extractObjectKeysByPrefix(nextContent, postContentPrefix);

    for (const previousKey of previousKeys) {
      if (!nextKeys.has(previousKey)) {
        await this.objectStorageService.deleteObject(previousKey, 'content-orphan');
      }
    }
  }

  /**
   * 본문 문자열에서 prefix 조건에 맞는 object key 집합을 반환합니다.
   */
  private extractObjectKeysByPrefix(content: string, prefix: string): Set<string> {
    if (!content) {
      return new Set();
    }

    const publicBasePath = this.objectStorageService.getPublicUrlBasePath();
    const escapedPublicBasePath = this.escapeRegExp(publicBasePath);
    const urlPattern = new RegExp(`${escapedPublicBasePath}[^\\s)"'<>]+`, 'g');
    const matches = content.match(urlPattern) ?? [];
    const objectKeys = new Set<string>();

    for (const url of matches) {
      const objectKey = this.objectStorageService.extractObjectKeyFromUrl(url);
      if (objectKey && objectKey.startsWith(prefix)) {
        objectKeys.add(objectKey);
      }
    }

    return objectKeys;
  }

  /**
   * 정규식 문자열을 안전하게 이스케이프합니다.
   */
  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
