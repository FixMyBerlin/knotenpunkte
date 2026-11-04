import { kvBaseUrl } from '@shared/config/shared.const'
import { KvError, type KvEntry } from '@shared/kv-client'
import { getOsmToken } from '@shared/osm/osm-auth'
import { get, set } from 'idb-keyval'
import { kvApiKey, kvProject } from '@/config/app.const'
import {
  batchSize,
  keineAktionDataSchema,
  keineAktionEntryId,
  keineAktionTag,
  type KeineAktion,
  type KeineAktionData,
  type KeineAktionSink,
} from './keine-aktion'
import { kvBatchPut } from './kv-batch'
import { kv, networkStore, osmLoginRequiredMessage } from './store'

export type KeineAktionStore = KeineAktionSink & {
  list: (gebiet: string) => Promise<KeineAktion[]>
  put: (gebiet: string, suggestionId: string) => Promise<KeineAktion>
}

function entryIdOrThrow(gebiet: string, suggestionId: string) {
  const id = keineAktionEntryId(gebiet, suggestionId)
  if (!id) throw new Error('Für diesen Vorschlag lässt sich „Keine Aktion nötig“ nicht speichern.')
  return id
}

function toKeineAktion(item: KvEntry<unknown>, data: KeineAktionData): KeineAktion {
  return { ...data, createdBy: item.created_by.display_name, createdAt: item.created_at }
}

function mapWriteError(error: unknown) {
  if (error instanceof KvError && error.code === 'unauthenticated') {
    return new Error(osmLoginRequiredMessage)
  }
  return error
}

function createKvKeineAktionStore(): KeineAktionStore {
  async function list(gebiet: string) {
    const records: KeineAktion[] = []
    let cursor: string | undefined
    do {
      const page = await kv.list({
        tags: [gebiet, keineAktionTag],
        match: 'all',
        limit: 500,
        cursor,
      })
      for (const item of page.items) {
        const parsed = keineAktionDataSchema.safeParse(item.data)
        if (parsed.success && parsed.data.gebiet === gebiet) {
          records.push(toKeineAktion(item, parsed.data))
        }
      }
      cursor = page.next_cursor ?? undefined
    } while (cursor)
    return records
  }
  return {
    list,
    async existing(gebiet) {
      return new Set((await list(gebiet)).map((record) => record.suggestionId))
    },
    async put(gebiet, suggestionId) {
      const data = { gebiet, suggestionId }
      try {
        const saved = await kv.put(entryIdOrThrow(gebiet, suggestionId), data, [
          gebiet,
          keineAktionTag,
        ])
        return toKeineAktion(saved, data)
      } catch (error) {
        throw mapWriteError(error)
      }
    },
    async putBatch(items) {
      if (items.length > batchSize) throw new Error(`Höchstens ${batchSize} Einträge pro Batch`)
      try {
        await kvBatchPut(
          { baseUrl: kvBaseUrl, project: kvProject, apiKey: kvApiKey, getOsmToken },
          items.map((data) => ({
            id: entryIdOrThrow(data.gebiet, data.suggestionId),
            data,
            tags: [data.gebiet, keineAktionTag],
          })),
        )
      } catch (error) {
        throw mapWriteError(error)
      }
    },
  }
}

const localPrefix = 'na:keine-aktion:'

type LocalRecords = Record<string, KeineAktion>

/** Test mode without a KV project: the decisions stay in this browser's IndexedDB, next to the entries. */
function createLocalKeineAktionStore(): KeineAktionStore {
  async function load(gebiet: string) {
    return ((await get(`${localPrefix}${gebiet}`)) ?? {}) as LocalRecords
  }
  function record(gebiet: string, suggestionId: string): KeineAktion {
    return { gebiet, suggestionId, createdBy: 'lokal', createdAt: new Date().toISOString() }
  }
  return {
    async list(gebiet) {
      return Object.values(await load(gebiet))
    },
    async existing(gebiet) {
      return new Set(Object.keys(await load(gebiet)))
    },
    async put(gebiet, suggestionId) {
      const stored = await load(gebiet)
      const item = stored[suggestionId] ?? record(gebiet, suggestionId)
      await set(`${localPrefix}${gebiet}`, { ...stored, [suggestionId]: item })
      return item
    },
    async putBatch(items) {
      const byGebiet = Map.groupBy(items, (item) => item.gebiet)
      for (const [gebiet, group] of byGebiet) {
        const stored = await load(gebiet)
        const next = { ...stored }
        for (const { suggestionId } of group) {
          next[suggestionId] ??= record(gebiet, suggestionId)
        }
        await set(`${localPrefix}${gebiet}`, next)
      }
    },
  }
}

export const keineAktionStore: KeineAktionStore =
  networkStore.mode === 'kv' ? createKvKeineAktionStore() : createLocalKeineAktionStore()

export const keineAktionQueryKey = (gebiet: string) => ['na-keine-aktion', gebiet] as const
export const keineAktionQueryRoot = ['na-keine-aktion'] as const
