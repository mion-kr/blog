import { SettingsService } from './settings.service'
import type { UploadsService } from '../uploads/uploads.service'
import type { SettingsResponseDto, UpdateSettingsDto } from './dto'

jest.mock('@repo/database', () => {
  const fromMock = jest.fn()
  const selectMock = jest.fn(() => ({ from: fromMock }))
  const transactionMock = jest.fn()

  return {
    db: {
      select: selectMock,
      transaction: transactionMock,
    },
    blogSettings: {},
    __mocks: {
      selectMock,
      fromMock,
      transactionMock,
    },
  }
})

const {
  __mocks: { selectMock, fromMock, transactionMock },
} = require('@repo/database') as {
  __mocks: {
    selectMock: jest.Mock
    fromMock: jest.Mock
    transactionMock: jest.Mock
  }
}

describe('SettingsService', () => {
  let uploadsService: jest.Mocked<UploadsService>
  let service: SettingsService
  let insertedEntries: Array<{ key: string; value: string }>

  const resolveRows = (entries: Array<{ key: string; value: string }>) =>
    entries.map(({ key, value }) => ({ key, value }))

  beforeEach(() => {
    jest.clearAllMocks()
    fromMock.mockReset()
    selectMock.mockReset()
    transactionMock.mockReset()
    uploadsService = {
      finalizeAboutImage: jest.fn(),
      deleteObjectByUrl: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UploadsService>

    selectMock.mockImplementation(() => ({ from: fromMock }))
    insertedEntries = []

    transactionMock.mockImplementation(async (callback: (tx: { insert: typeof jest.fn }) => Promise<void>) => {
      const txInsert = jest.fn(() => ({
        values: (entry: { key: string; value: string }) => {
          insertedEntries.push(entry)
          return {
            onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
          }
        },
      }))

      await callback({ insert: txInsert })
    })

    service = new SettingsService(uploadsService)
  })

  describe('findAll', () => {
    it('should return default settings when no rows exist', async () => {
      fromMock.mockResolvedValueOnce([])

      const result = await service.findAll()

      expect(result).toMatchObject<Partial<SettingsResponseDto>>({
        siteTitle: "Mion's Blog",
        siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
        siteUrl: 'http://localhost:3000',
        postsPerPage: 10,
        profileImageUrl: null,
      })
    })
  })

  describe('update', () => {
    const baseRows = resolveRows([
      { key: 'site_title', value: "Mion's Blog" },
      { key: 'site_description', value: '개발과 기술에 관한 이야기를 나눕니다.' },
      { key: 'site_url', value: 'http://localhost:3000' },
      { key: 'posts_per_page', value: '10' },
    ])

    it('should skip transaction when nothing changes', async () => {
      fromMock.mockResolvedValueOnce(baseRows)
      fromMock.mockResolvedValueOnce(baseRows)

      const result = await service.update({}, 'user-1')

      expect(transactionMock).not.toHaveBeenCalled()
      expect(uploadsService.finalizeAboutImage).not.toHaveBeenCalled()
      expect(result.siteTitle).toBe("Mion's Blog")
    })

    it('should remove profile image when requested', async () => {
      const currentRows = resolveRows([
        ...baseRows,
        { key: 'profile_image_url', value: 'https://cdn.example.com/development/about/old.png' },
      ])
      const updatedRows = resolveRows([
        ...baseRows,
        { key: 'profile_image_url', value: '' },
      ])

      fromMock.mockResolvedValueOnce(currentRows)
      const existing = await service.findAll()
      expect(existing.profileImageUrl).toBe('https://cdn.example.com/development/about/old.png')

      fromMock.mockResolvedValueOnce(currentRows)
      fromMock.mockResolvedValueOnce(updatedRows)

      const dto: UpdateSettingsDto = { profileImageRemove: true }
      const result = await service.update(dto, 'user-1')

      expect(uploadsService.deleteObjectByUrl).toHaveBeenCalledTimes(1)
      expect(uploadsService.deleteObjectByUrl.mock.calls[0]?.[0]).toBe('https://cdn.example.com/development/about/old.png')
      expect(uploadsService.finalizeAboutImage).not.toHaveBeenCalled()
      expect(insertedEntries).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'profile_image_url', value: '' })]),
      )
      expect(result.profileImageUrl).toBeNull()
    })

    it('should finalize draft profile image and delete previous file', async () => {
      const draftUrl = 'https://cdn.example.com/development/draft/uuid/about/1700-avatar.png'
      const finalizedUrl = 'https://cdn.example.com/development/about/1700-avatar.png'
      const currentRows = resolveRows([
        ...baseRows,
        { key: 'profile_image_url', value: 'https://cdn.example.com/development/about/old.png' },
      ])
      const updatedRows = resolveRows([
        ...baseRows,
        { key: 'profile_image_url', value: finalizedUrl },
      ])

      uploadsService.finalizeAboutImage.mockResolvedValue(finalizedUrl)
      fromMock.mockResolvedValueOnce(currentRows)
      await service.findAll()

      fromMock.mockResolvedValueOnce(currentRows)
      fromMock.mockResolvedValueOnce(updatedRows)

      const dto: UpdateSettingsDto = { profileImageUrl: draftUrl }
      const result = await service.update(dto, 'user-1')

      expect(uploadsService.finalizeAboutImage).toHaveBeenCalledWith(draftUrl)
      expect(uploadsService.deleteObjectByUrl).toHaveBeenCalledWith('https://cdn.example.com/development/about/old.png')
      expect(insertedEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'profile_image_url', value: finalizedUrl }),
        ]),
      )
      expect(result.profileImageUrl).toBe(finalizedUrl)
    })

    it('should store provided public url as-is', async () => {
      const newUrl = 'https://cdn.example.com/development/about/static.png'
      const currentRows = resolveRows(baseRows)
      const updatedRows = resolveRows([
        ...baseRows,
        { key: 'profile_image_url', value: newUrl },
      ])

      fromMock.mockResolvedValueOnce(currentRows)
      await service.findAll()

      fromMock.mockResolvedValueOnce(currentRows)
      fromMock.mockResolvedValueOnce(updatedRows)

      const result = await service.update({ profileImageUrl: newUrl }, 'user-1')

      expect(uploadsService.finalizeAboutImage).not.toHaveBeenCalled()
      expect(uploadsService.deleteObjectByUrl).not.toHaveBeenCalled()
      expect(insertedEntries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: 'profile_image_url', value: newUrl }),
        ]),
      )
      expect(result.profileImageUrl).toBe(newUrl)
    })
  })
})
