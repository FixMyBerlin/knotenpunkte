import { describe, expect, it } from 'vitest'
import {
  keineAktionEntryId,
  localKeineAktionKey,
  mergeIdRecords,
  parseIdRecord,
  takeOverLocalKeineAktion,
  transferKeineAktion,
  type KeineAktionData,
  type KeineAktionSink,
  type StorageLike,
} from './keine-aktion'

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  const storage: StorageLike = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
  return { storage, items }
}

/** Records every batch; `failOnBatch` (1-based) makes that batch throw. */
function fakeSink(existing: Record<string, string[]> = {}, failOnBatch?: number) {
  const batches: KeineAktionData[][] = []
  const sink: KeineAktionSink = {
    existing: async (gebiet) => new Set(existing[gebiet] ?? []),
    putBatch: async (items) => {
      if (failOnBatch === batches.length + 1) throw new Error('Netzwerkfehler')
      batches.push(items)
    },
  }
  return { sink, batches }
}

const ids = (count: number, prefix = 'e') =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}@1.5`)

describe('keineAktionEntryId', () => {
  it('uses gebiet, tag and the suggestion id, with @ replaced', () => {
    expect(keineAktionEntryId('berlin', '37510001_V1-2.01@12.5')).toBe(
      'berlin:keine-aktion:37510001_V1-2.01:12.5',
    )
  })

  it('refuses invalid areas, empty ids and ids over 128 characters', () => {
    expect(keineAktionEntryId('Berlin Mitte', 'a@1')).toBeNull()
    expect(keineAktionEntryId('berlin', '')).toBeNull()
    expect(keineAktionEntryId('berlin', 'x'.repeat(120))).toBeNull()
  })
})

describe('parseIdRecord / mergeIdRecords', () => {
  it('reads the old localStorage shape and rejects anything else', () => {
    expect(parseIdRecord('{"berlin":["a","b"]}')).toEqual({ berlin: ['a', 'b'] })
    expect(parseIdRecord('["a"]')).toBeNull()
    expect(parseIdRecord('{"berlin":"a"}')).toBeNull()
    expect(parseIdRecord('not json')).toBeNull()
    expect(parseIdRecord(null)).toBeNull()
  })

  it('merges without duplicates', () => {
    expect(mergeIdRecords({ a: ['1', '2'] }, { a: ['2', '3'], b: ['9'] })).toEqual({
      a: ['1', '2', '3'],
      b: ['9'],
    })
  })
})

describe('transferKeineAktion', () => {
  it('writes in batches of 25', async () => {
    const { sink, batches } = fakeSink()
    const result = await transferKeineAktion(sink, { berlin: ids(60) })
    expect(batches.map((batch) => batch.length)).toEqual([25, 25, 10])
    expect(result).toEqual({ written: 60, alreadyThere: 0, ignored: 0 })
  })

  it('fills batches across areas', async () => {
    const { sink, batches } = fakeSink()
    await transferKeineAktion(sink, { berlin: ids(20), potsdam: ids(10) })
    expect(batches.map((batch) => batch.length)).toEqual([25, 5])
    expect(batches[0]!.at(-1)).toMatchObject({ gebiet: 'potsdam' })
  })

  it('skips ids that exist already and duplicates', async () => {
    const { sink, batches } = fakeSink({ berlin: ['a@1', 'b@1'] })
    const result = await transferKeineAktion(sink, { berlin: ['a@1', 'b@1', 'c@1', 'c@1'] })
    expect(batches.flat()).toEqual([{ gebiet: 'berlin', suggestionId: 'c@1' }])
    expect(result).toEqual({ written: 1, alreadyThere: 2, ignored: 0 })
  })

  it('ignores what cannot be stored', async () => {
    const { sink, batches } = fakeSink()
    const result = await transferKeineAktion(sink, { 'Kein Gebiet': ['a@1'], berlin: ['', 'ok@1'] })
    expect(batches.flat()).toEqual([{ gebiet: 'berlin', suggestionId: 'ok@1' }])
    expect(result).toEqual({ written: 1, alreadyThere: 0, ignored: 2 })
  })

  it('sends nothing when everything exists', async () => {
    const { sink, batches } = fakeSink({ berlin: ['a@1'] })
    await transferKeineAktion(sink, { berlin: ['a@1'] })
    expect(batches).toEqual([])
  })
})

describe('takeOverLocalKeineAktion', () => {
  it('removes the local key after all batches succeeded', async () => {
    const { storage, items } = fakeStorage({
      [localKeineAktionKey]: JSON.stringify({ berlin: ids(30) }),
      'na:skipped-suggestions': '{"berlin":["x"]}',
    })
    const { sink, batches } = fakeSink()
    const result = await takeOverLocalKeineAktion(sink, storage)
    expect(result?.written).toBe(30)
    expect(batches).toHaveLength(2)
    expect(items.has(localKeineAktionKey)).toBe(false)
    expect(items.has('na:skipped-suggestions')).toBe(true)
  })

  it('keeps the local key when a batch fails', async () => {
    const { storage, items } = fakeStorage({
      [localKeineAktionKey]: JSON.stringify({ berlin: ids(30) }),
    })
    const { sink, batches } = fakeSink({}, 2)
    await expect(takeOverLocalKeineAktion(sink, storage)).rejects.toThrow('Netzwerkfehler')
    expect(batches).toHaveLength(1)
    expect(items.has(localKeineAktionKey)).toBe(true)
  })

  it('does nothing without local markings', async () => {
    const { sink, batches } = fakeSink()
    expect(await takeOverLocalKeineAktion(sink, fakeStorage().storage)).toBeNull()
    expect(
      await takeOverLocalKeineAktion(sink, fakeStorage({ [localKeineAktionKey]: '{}' }).storage),
    ).toBeNull()
    expect(
      await takeOverLocalKeineAktion(
        sink,
        fakeStorage({ [localKeineAktionKey]: 'garbage' }).storage,
      ),
    ).toBeNull()
    expect(batches).toEqual([])
  })

  it('is safe to run twice: a second run finds the entries and writes nothing new', async () => {
    const stored = new Map<string, Set<string>>()
    const sink: KeineAktionSink = {
      existing: async (gebiet) => new Set(stored.get(gebiet) ?? []),
      putBatch: async (items) => {
        for (const { gebiet, suggestionId } of items) {
          stored.set(gebiet, (stored.get(gebiet) ?? new Set()).add(suggestionId))
        }
      },
    }
    const value = JSON.stringify({ berlin: ids(3) })
    await takeOverLocalKeineAktion(sink, fakeStorage({ [localKeineAktionKey]: value }).storage)
    const again = await takeOverLocalKeineAktion(
      sink,
      fakeStorage({ [localKeineAktionKey]: value }).storage,
    )
    expect(again).toEqual({ written: 0, alreadyThere: 3, ignored: 0 })
  })
})
