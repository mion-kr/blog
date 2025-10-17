import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CopyObjectCommand, DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { UploadsService } from './uploads.service'

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}))

const getSignedUrlMock = getSignedUrl as jest.Mock

describe('UploadsService', () => {
  const sendMock = jest.fn()
  const s3Client = { send: sendMock } as unknown as S3Client

  const configValues: Record<string, string> = {
    MINIO_BUCKET: 'development',
    MINIO_PUBLIC_ENDPOINT: 'https://cdn.example.com',
    UPLOAD_ALLOWED_MIME: 'image/png,image/jpeg',
    UPLOAD_MAX_SIZE: '10485760',
    NODE_ENV: 'development',
  }

  const configGetMock = jest.fn((key: string) => configValues[key])
  const configService = { get: configGetMock } as unknown as ConfigService

  const createService = () => new UploadsService(s3Client, configService)

  beforeEach(() => {
    jest.clearAllMocks()
    Object.assign(configValues, {
      MINIO_BUCKET: 'development',
      MINIO_PUBLIC_ENDPOINT: 'https://cdn.example.com',
      UPLOAD_ALLOWED_MIME: 'image/png,image/jpeg',
      UPLOAD_MAX_SIZE: '10485760',
      NODE_ENV: 'development',
    })
  })

  describe('createPreSignedUrl', () => {
    it('should return upload metadata for valid request', async () => {
      const service = createService()
      const fixedTimestamp = 1_700_000_000_000
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedTimestamp)
      getSignedUrlMock.mockResolvedValue('https://signed-url')

      const dto = {
        filename: 'Profile Image.PNG',
        mimeType: 'image/png',
        size: 1024,
        draftUuid: 'draft-uuid',
        type: 'about' as const,
      }

      const result = await service.createPreSignedUrl(dto)

      const expectedKey = 'draft/draft-uuid/about/1700000000-profile-image.png'

      expect(result).toEqual({
        uploadUrl: 'https://signed-url',
        objectKey: expectedKey,
        publicUrl: `https://cdn.example.com/development/${expectedKey}`,
        expiresIn: 300,
      })

      const putCommand = getSignedUrlMock.mock.calls[0][1] as PutObjectCommand
      expect(putCommand.input).toMatchObject({
        Bucket: 'development',
        Key: expectedKey,
        ContentType: 'image/png',
        ContentLength: 1024,
      })
      expect(sendMock).not.toHaveBeenCalled()

      dateSpy.mockRestore()
    })

    it('should reject unsupported mime types', async () => {
      configValues.UPLOAD_ALLOWED_MIME = 'image/jpeg'
      const service = createService()

      await expect(
        service.createPreSignedUrl({
          filename: 'image.png',
          mimeType: 'image/png',
          size: 10,
          draftUuid: 'uuid',
          type: 'about',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should wrap errors from presigner', async () => {
      const service = createService()
      getSignedUrlMock.mockRejectedValue(new Error('boom'))

      await expect(
        service.createPreSignedUrl({
          filename: 'image.png',
          mimeType: 'image/png',
          size: 10,
          draftUuid: 'uuid',
          type: 'about',
        }),
      ).rejects.toThrow(InternalServerErrorException)
    })
  })

  describe('finalizeAboutImage', () => {
    it('should copy draft object to about location and delete draft', async () => {
      const service = createService()
      sendMock.mockResolvedValue(undefined)

      const tempUrl = 'https://cdn.example.com/development/draft/uuid/about/1700000000-avatar.png'
      const result = await service.finalizeAboutImage(tempUrl)

      expect(result).toBe('https://cdn.example.com/development/about/1700000000-avatar.png')
      expect(sendMock).toHaveBeenCalledTimes(2)

      const copyCommand = sendMock.mock.calls[0][0] as CopyObjectCommand
      expect(copyCommand.input).toMatchObject({
        Bucket: 'development',
        Key: 'about/1700000000-avatar.png',
      })

      const deleteDraft = sendMock.mock.calls[1][0] as DeleteObjectCommand
      expect(deleteDraft.input).toMatchObject({
        Bucket: 'development',
        Key: 'draft/uuid/about/1700000000-avatar.png',
      })
    })

    it('should throw when url is not from draft bucket', async () => {
      const service = createService()

      await expect(
        service.finalizeAboutImage('https://cdn.example.com/development/about/avatar.png'),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('deleteObjectByUrl', () => {
    it('should delete object when url belongs to bucket', async () => {
      const service = createService()
      sendMock.mockResolvedValue(undefined)

      await service.deleteObjectByUrl('https://cdn.example.com/development/about/avatar.png')

      const deleteCmd = sendMock.mock.calls[0][0] as DeleteObjectCommand
      expect(deleteCmd.input).toMatchObject({
        Bucket: 'development',
        Key: 'about/avatar.png',
      })
    })

    it('should ignore unknown urls', async () => {
      const service = createService()

      await service.deleteObjectByUrl('https://other.cdn/about/avatar.png')

      expect(sendMock).not.toHaveBeenCalled()
    })
  })
})
