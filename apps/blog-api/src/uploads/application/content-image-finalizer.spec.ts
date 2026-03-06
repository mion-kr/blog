import { ContentImageFinalizer } from './content-image-finalizer'
import type { ObjectStorageService } from '../storage/object-storage.service'

describe('ContentImageFinalizer', () => {
  let objectStorageService: jest.Mocked<ObjectStorageService>
  let service: ContentImageFinalizer

  beforeEach(() => {
    objectStorageService = {
      copyObject: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      buildPublicUrl: jest.fn((key: string) => `https://cdn.example.com/development/${key}`),
      extractObjectKeyFromUrl: jest.fn((url?: string | null) => {
        if (!url) return null
        const normalizedUrl = url.split(/[?#]/)[0] ?? url
        const prefix = 'https://cdn.example.com/development/'

        return normalizedUrl.startsWith(prefix) ? normalizedUrl.substring(prefix.length) : null
      }),
      getObjectKeyBasePath: jest.fn(() => ''),
      getPublicUrlBasePath: jest.fn(() => 'https://cdn.example.com/development/'),
    } as unknown as jest.Mocked<ObjectStorageService>

    service = new ContentImageFinalizer(objectStorageService)
  })

  it('should move draft content images and replace markdown urls', async () => {
    const draftUrl =
      'https://cdn.example.com/development/draft/draft-uuid/content/1700000000-flow.png?v=1#section'
    const nextContent = `# 제목\n\n![flow](${draftUrl})\n\n![flow-dup](${draftUrl})`

    const result = await service.finalizePostContentImagesWithReport({
      postId: 'post-1',
      draftUuid: 'draft-uuid',
      nextContent,
    })

    expect(result.content).toContain(
      'https://cdn.example.com/development/posts/post-1/content/1700000000-flow.png',
    )
    expect(result.content).not.toContain(draftUrl)
    expect(result.movedObjects).toEqual([
      {
        sourceKey: 'draft/draft-uuid/content/1700000000-flow.png',
        destinationKey: 'posts/post-1/content/1700000000-flow.png',
      },
    ])
    expect(objectStorageService.copyObject).toHaveBeenCalledTimes(1)
  })

  it('should delete removed post content images', async () => {
    const previousContent = [
      '![keep](https://cdn.example.com/development/posts/post-1/content/keep.png)',
      '![old](https://cdn.example.com/development/posts/post-1/content/old.png)',
    ].join('\n')
    const nextContent =
      '![keep](https://cdn.example.com/development/posts/post-1/content/keep.png)'

    await service.cleanupRemovedPostContentImages({
      postId: 'post-1',
      previousContent,
      nextContent,
    })

    expect(objectStorageService.deleteObject).toHaveBeenCalledWith(
      'posts/post-1/content/old.png',
      'content-orphan',
    )
  })
})
