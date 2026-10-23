import { KvError, type KvClient } from '@shared/kv-client'
import { describe, expect, it, vi } from 'vitest'
import { buildRatingRecord } from './build-record'
import { createKvRatingStore, RatingConflictError } from './kv-rating-store'
import { emptyRapidDraft, type RatingRecord } from './schema'

const record = buildRatingRecord({ draft: emptyRapidDraft(), suggestions: [], actor: 'a' })
const user = { osm_uid: 1, display_name: 'a' }
const entry = (id: string, data: unknown, version: number) => ({
  id,
  data: data as RatingRecord,
  tags: ['berlin'],
  version,
  created_at: '',
  updated_at: '',
  created_by: user,
  updated_by: user,
})

function fakeClient(items: ReturnType<typeof entry>[]) {
  return {
    list: vi.fn(async () => ({ items, next_cursor: null })),
    put: vi.fn(async (id: string, data: RatingRecord) => entry(id, data, 8)),
  } as unknown as KvClient<RatingRecord> & { put: ReturnType<typeof vi.fn> }
}

describe('createKvRatingStore', () => {
  it('saves a new entry without a version and a known one with its version', async () => {
    const client = fakeClient([entry('berlin:1', record, 7)])
    const store = createKvRatingStore(client)
    await store.list('berlin')

    await store.put('berlin', '2', record)
    expect(client.put).toHaveBeenLastCalledWith('berlin:2', record, ['berlin'], undefined)

    await store.put('berlin', '1', record)
    expect(client.put).toHaveBeenLastCalledWith('berlin:1', record, ['berlin'], { ifMatch: '"7"' })

    await store.put('berlin', '1', record)
    expect(client.put).toHaveBeenLastCalledWith('berlin:1', record, ['berlin'], { ifMatch: '"8"' })
  })

  it('reports a save on an outdated entry as a conflict', async () => {
    const client = fakeClient([])
    client.put.mockRejectedValue(new KvError(409, 'version_conflict', 'conflict'))
    await expect(createKvRatingStore(client).put('berlin', '1', record)).rejects.toBeInstanceOf(
      RatingConflictError,
    )
  })

  it('lists the entries it cannot read instead of the records', async () => {
    const client = fakeClient([entry('berlin:1', record, 1), entry('berlin:2', { status: 5 }, 1)])
    const store = createKvRatingStore(client)
    expect(Object.keys(await store.list('berlin'))).toEqual(['1'])
    expect(await store.listUnreadable('berlin')).toEqual(['2'])
  })
})
