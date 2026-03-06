import { BadRequestException } from '@nestjs/common'

import { UploadPolicyService } from './upload-policy.service'
import type { ObjectStorageService } from '../storage/object-storage.service'

describe('UploadPolicyService', () => {
  const configValues: Record<string, string> = {
    UPLOAD_ALLOWED_MIME: 'image/png,image/jpeg',
    UPLOAD_MAX_SIZE: '10485760',
  }

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  }
  const objectStorageService = {
    getObjectKeyBasePath: jest.fn(() => ''),
  } as unknown as ObjectStorageService

  beforeEach(() => {
    jest.clearAllMocks()
    configValues.UPLOAD_ALLOWED_MIME = 'image/png,image/jpeg'
    configValues.UPLOAD_MAX_SIZE = '10485760'
  })

  it('should build a normalized draft object key', () => {
    const service = new UploadPolicyService(
      configService as never,
      objectStorageService,
    )

    const result = service.buildObjectKey(
      {
        filename: 'Profile Image.PNG',
        mimeType: 'image/png',
        size: 1024,
        draftUuid: 'draft-uuid',
        type: 'about',
      },
      1_700_000_000_000,
    )

    expect(result).toBe('draft/draft-uuid/about/1700000000000-profile-image.png')
  })

  it('should reject unsupported mime types', () => {
    configValues.UPLOAD_ALLOWED_MIME = 'image/jpeg'
    const service = new UploadPolicyService(
      configService as never,
      objectStorageService,
    )

    expect(() => service.validateFile('image/png', 1024)).toThrow(BadRequestException)
  })

  it('should reject files larger than configured limit', () => {
    const service = new UploadPolicyService(
      configService as never,
      objectStorageService,
    )

    expect(() => service.validateFile('image/png', 20 * 1024 * 1024)).toThrow(
      BadRequestException,
    )
  })
})
