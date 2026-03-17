import { SettingsService } from './settings.service'
import type { UploadsService } from '../uploads/uploads.service'
import type { SettingsResponseDto, UpdateSettingsDto } from './dto'
import type {
  SettingsRepository,
  SettingsRow,
} from './repositories/settings.repository'

describe('SettingsService', () => {
  let uploadsService: jest.Mocked<UploadsService>
  let settingsRepository: jest.Mocked<SettingsRepository>
  let service: SettingsService

  const resolveRows = (entries: Array<{ key: SettingsRow['key']; value: string }>) =>
    entries.map(({ key, value }) => ({ key, value }))

  beforeEach(() => {
    uploadsService = {
      finalizeAboutImage: jest.fn(),
      deleteObjectByUrl: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UploadsService>

    settingsRepository = {
      findAll: jest.fn(),
      upsertMany: jest.fn().mockResolvedValue(undefined),
    }

    service = new SettingsService(uploadsService, settingsRepository)
  })

  describe('findAll', () => {
    it('should return default settings when no rows exist', async () => {
      settingsRepository.findAll.mockResolvedValueOnce([])

      const result = await service.findAll()

      expect(result).toMatchObject<Partial<SettingsResponseDto>>({
        siteTitle: "Mion's Blog",
        siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
        siteUrl: 'http://localhost:3000',
        postsPerPage: 10,
        profileImageUrl: null,
      })
    })

    it('should return public settings without admin-only fields', async () => {
      settingsRepository.findAll.mockResolvedValueOnce(
        resolveRows([
          { key: 'site_title', value: "Mion's Blog" },
          { key: 'site_description', value: '개발과 기술에 관한 이야기를 나눕니다.' },
          { key: 'site_url', value: 'https://mion.blog' },
          { key: 'posts_per_page', value: '20' },
          {
            key: 'profile_image_url',
            value: 'https://cdn.example.com/development/about/profile.png',
          },
        ]),
      )

      const result = await service.findPublicSettings()

      expect(result).toEqual({
        siteTitle: "Mion's Blog",
        siteDescription: '개발과 기술에 관한 이야기를 나눕니다.',
        siteUrl: 'https://mion.blog',
        profileImageUrl: 'https://cdn.example.com/development/about/profile.png',
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

    it('should skip persistence when nothing changes', async () => {
      settingsRepository.findAll.mockResolvedValueOnce(baseRows)

      const result = await service.update({}, 'user-1')

      expect(settingsRepository.upsertMany).not.toHaveBeenCalled()
      expect(uploadsService.finalizeAboutImage).not.toHaveBeenCalled()
      expect(result.siteTitle).toBe("Mion's Blog")
    })

    it('should remove profile image when requested', async () => {
      const currentRows = resolveRows([
        ...baseRows,
        {
          key: 'profile_image_url',
          value: 'https://cdn.example.com/development/about/old.png',
        },
      ])
      const updatedRows = resolveRows([...baseRows, { key: 'profile_image_url', value: '' }])
      settingsRepository.findAll
        .mockResolvedValueOnce(currentRows)
        .mockResolvedValueOnce(updatedRows)

      const dto: UpdateSettingsDto = { profileImageRemove: true }
      const result = await service.update(dto, 'user-1')

      expect(uploadsService.deleteObjectByUrl).toHaveBeenCalledWith(
        'https://cdn.example.com/development/about/old.png',
      )
      expect(settingsRepository.upsertMany).toHaveBeenCalledWith(
        [{ key: 'profile_image_url', value: '' }],
        'user-1',
      )
      expect(result.profileImageUrl).toBeNull()
    })

    it('should finalize draft profile image and delete previous file', async () => {
      const draftUrl = 'https://cdn.example.com/development/draft/uuid/about/1700-avatar.png'
      const finalizedUrl = 'https://cdn.example.com/development/about/1700-avatar.png'
      const currentRows = resolveRows([
        ...baseRows,
        {
          key: 'profile_image_url',
          value: 'https://cdn.example.com/development/about/old.png',
        },
      ])
      const updatedRows = resolveRows([
        ...baseRows,
        { key: 'profile_image_url', value: finalizedUrl },
      ])
      uploadsService.finalizeAboutImage.mockResolvedValue(finalizedUrl)
      settingsRepository.findAll
        .mockResolvedValueOnce(currentRows)
        .mockResolvedValueOnce(updatedRows)

      const dto: UpdateSettingsDto = { profileImageUrl: draftUrl }
      const result = await service.update(dto, 'user-1')

      expect(uploadsService.finalizeAboutImage).toHaveBeenCalledWith(draftUrl)
      expect(uploadsService.deleteObjectByUrl).toHaveBeenCalledWith(
        'https://cdn.example.com/development/about/old.png',
      )
      expect(settingsRepository.upsertMany).toHaveBeenCalledWith(
        [{ key: 'profile_image_url', value: finalizedUrl }],
        'user-1',
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
      settingsRepository.findAll
        .mockResolvedValueOnce(currentRows)
        .mockResolvedValueOnce(updatedRows)

      const result = await service.update({ profileImageUrl: newUrl }, 'user-1')

      expect(uploadsService.finalizeAboutImage).not.toHaveBeenCalled()
      expect(uploadsService.deleteObjectByUrl).not.toHaveBeenCalled()
      expect(settingsRepository.upsertMany).toHaveBeenCalledWith(
        [{ key: 'profile_image_url', value: newUrl }],
        'user-1',
      )
      expect(result.profileImageUrl).toBe(newUrl)
    })
  })
})
