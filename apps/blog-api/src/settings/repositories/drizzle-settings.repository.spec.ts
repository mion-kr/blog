import { DrizzleSettingsRepository } from './drizzle-settings.repository'

jest.mock('@repo/database', () => {
  const fromMock = jest.fn()
  const selectMock = jest.fn(() => ({ from: fromMock }))
  const transactionMock = jest.fn()

  return {
    db: {
      select: selectMock,
      transaction: transactionMock,
    },
    blogSettings: {
      key: 'key',
    },
    __mocks: {
      selectMock,
      fromMock,
      transactionMock,
    },
  }
})

const {
  __mocks: { fromMock, transactionMock },
} = require('@repo/database') as {
  __mocks: {
    fromMock: jest.Mock
    transactionMock: jest.Mock
  }
}

describe('DrizzleSettingsRepository', () => {
  let repository: DrizzleSettingsRepository
  let insertedEntries: Array<{ key: string; value: string }>

  beforeEach(() => {
    jest.clearAllMocks()
    insertedEntries = []
    repository = new DrizzleSettingsRepository()

    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<void>) => {
      const txInsert: any = jest.fn(() => ({
        values: (entry: { key: string; value: string }) => {
          insertedEntries.push(entry)
          return {
            onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
          }
        },
      }))

      await callback({ insert: txInsert })
    })
  })

  it('should normalize rows from database', async () => {
    fromMock.mockResolvedValueOnce([{ key: 'site_title', value: 'My Blog' }])

    const result = await repository.findAll()

    expect(result).toEqual([{ key: 'site_title', value: 'My Blog' }])
  })

  it('should upsert all changed settings in one transaction', async () => {
    await repository.upsertMany(
      [
        { key: 'site_title', value: 'My Blog' },
        { key: 'site_url', value: 'https://example.com' },
      ],
      'user-1',
    )

    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(insertedEntries).toEqual([
      expect.objectContaining({ key: 'site_title', value: 'My Blog' }),
      expect.objectContaining({ key: 'site_url', value: 'https://example.com' }),
    ])
  })
})
