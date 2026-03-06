import { BadRequestException } from '@nestjs/common'

import { UploadsService } from './uploads.service'
import type { ContentImageFinalizer } from './application/content-image-finalizer'
import type { UploadPolicyService } from './application/upload-policy.service'
import type { ObjectStorageService } from './storage/object-storage.service'

describe('UploadsService', () => {
  let objectStorageService: jest.Mocked<ObjectStorageService>
  let uploadPolicyService: jest.Mocked<UploadPolicyService>
  let contentImageFinalizer: jest.Mocked<ContentImageFinalizer>
  let service: UploadsService

  beforeEach(() => {
    objectStorageService = {
      createSignedUploadUrl: jest.fn(),
      copyObject: jest.fn(),
      deleteObject: jest.fn(),
      deleteObjects: jest.fn(),
      buildPublicUrl: jest.fn((key: string) => `https://cdn.example.com/development/${key}`),
      extractObjectKeyFromUrl: jest.fn(),
      getObjectKeyBasePath: jest.fn(() => ''),
      getPublicUrlBasePath: jest.fn(() => 'https://cdn.example.com/development/'),
    } as unknown as jest.Mocked<ObjectStorageService>

    uploadPolicyService = {
      validateFile: jest.fn(),
      buildObjectKey: jest.fn(),
      getExpiresIn: jest.fn(() => 300),
    } as unknown as jest.Mocked<UploadPolicyService>

    contentImageFinalizer = {
      finalizePostContentImagesWithReport: jest.fn(),
      cleanupRemovedPostContentImages: jest.fn(),
    } as unknown as jest.Mocked<ContentImageFinalizer>

    service = new UploadsService(
      objectStorageService,
      uploadPolicyService,
      contentImageFinalizer,
    )
  })

  it('should orchestrate pre-signed upload creation', async () => {
    uploadPolicyService.buildObjectKey.mockReturnValue(
      'draft/uuid/about/1700000000-avatar.png',
    )
    objectStorageService.createSignedUploadUrl.mockResolvedValue('https://signed-url')

    const result = await service.createPreSignedUrl({
      filename: 'avatar.png',
      mimeType: 'image/png',
      size: 1024,
      draftUuid: 'uuid',
      type: 'about',
    })

    expect(uploadPolicyService.validateFile).toHaveBeenCalledWith('image/png', 1024)
    expect(objectStorageService.createSignedUploadUrl).toHaveBeenCalled()
    expect(result).toEqual({
      uploadUrl: 'https://signed-url',
      objectKey: 'draft/uuid/about/1700000000-avatar.png',
      publicUrl: 'https://cdn.example.com/development/draft/uuid/about/1700000000-avatar.png',
      expiresIn: 300,
    })
  })

  it('should delegate content finalization report', async () => {
    contentImageFinalizer.finalizePostContentImagesWithReport.mockResolvedValue({
      content: 'updated',
      movedObjects: [],
    })

    const result = await service.finalizePostContentImagesWithReport({
      postId: 'post-1',
      draftUuid: 'draft-uuid',
      nextContent: 'draft',
    })

    expect(contentImageFinalizer.finalizePostContentImagesWithReport).toHaveBeenCalled()
    expect(result.content).toBe('updated')
  })

  it('should finalize about image through storage adapter', async () => {
    objectStorageService.extractObjectKeyFromUrl.mockReturnValue(
      'draft/uuid/about/1700000000-avatar.png',
    )
    objectStorageService.copyObject.mockResolvedValue(undefined)
    objectStorageService.deleteObject.mockResolvedValue(undefined)

    const result = await service.finalizeAboutImage(
      'https://cdn.example.com/development/draft/uuid/about/1700000000-avatar.png',
    )

    expect(objectStorageService.copyObject).toHaveBeenCalledWith(
      'draft/uuid/about/1700000000-avatar.png',
      'about/1700000000-avatar.png',
    )
    expect(result).toBe('https://cdn.example.com/development/about/1700000000-avatar.png')
  })

  it('should reject invalid about draft url', async () => {
    objectStorageService.extractObjectKeyFromUrl.mockReturnValue(null)

    await expect(
      service.finalizeAboutImage('https://cdn.example.com/development/about/avatar.png'),
    ).rejects.toThrow(BadRequestException)
  })
})
