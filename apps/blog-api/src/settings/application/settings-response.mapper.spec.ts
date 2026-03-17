import {
  DEFAULT_SETTINGS,
  mapSettingsRowsToResponse,
  normalizeOptionalString,
} from './settings-response.mapper'

describe('settings-response.mapper', () => {
  it('should apply defaults when rows are missing', () => {
    const result = mapSettingsRowsToResponse([])

    expect(result).toMatchObject(DEFAULT_SETTINGS)
  })

  it('should map persisted rows to response dto', () => {
    const result = mapSettingsRowsToResponse([
      { key: 'site_title', value: 'Custom Blog' },
      { key: 'site_description', value: '설명' },
      { key: 'site_url', value: 'https://example.com' },
      { key: 'posts_per_page', value: '24' },
      { key: 'profile_image_url', value: 'https://cdn.example.com/profile.png' },
    ])

    expect(result).toMatchObject({
      siteTitle: 'Custom Blog',
      siteDescription: '설명',
      siteUrl: 'https://example.com',
      postsPerPage: 24,
      profileImageUrl: 'https://cdn.example.com/profile.png',
    })
  })

  it('should normalize empty optional strings to null', () => {
    expect(normalizeOptionalString('')).toBeNull()
    expect(normalizeOptionalString('   ')).toBeNull()
    expect(normalizeOptionalString(undefined)).toBeNull()
  })
})
