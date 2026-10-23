import { kvBaseUrl } from '@shared/config/shared.const'
import { createKvClient, KvError, type KvClient, type KvEntry } from '@shared/kv-client'
import { createVersionTracker } from '@shared/kv/version-tracker'
import { getOsmToken } from '@shared/osm/osm-auth'
import { get, set } from 'idb-keyval'
import { isKvConfigured, kvApiKey, kvProject } from '@/config/app.const'
import { entrySchema, type Entry, type Stored } from './schema'

const osmLoginRequiredMessage = 'Zum Speichern mit OSM anmelden'

/** Somebody else changed the entry since it was loaded; nothing was written. */
export class NetworkConflictError extends Error {
  constructor() {
    super(
      'Jemand anderes hat diesen Eintrag inzwischen geändert. Der aktuelle Stand wurde geladen – bitte prüfen und erneut speichern.',
    )
    this.name = 'NetworkConflictError'
  }
}

export type StoredList = {
  entries: Stored[]
  /** Ids of entries that do not match the schema; they are never overwritten. */
  unreadable: string[]
}

export type NetworkStore = {
  mode: 'kv' | 'lokal'
  list: (gebiet: string) => Promise<StoredList>
  /** Throws `NetworkConflictError` when the entry changed since it was last read here. */
  put: (gebiet: string, id: string, data: Entry) => Promise<Stored>
  /** Areas with entries, by tag. */
  listAreas: () => Promise<{ gebiet: string; count: number }[]>
}

const kindTags = { virtual_node: 'vk', new_edge: 'kante' } as const
const reservedTags = new Set<string>(Object.values(kindTags))

function kvId(gebiet: string, data: Entry, id: string) {
  return `${gebiet}:${kindTags[data.kind]}:${id}`
}

function idFromKvId(kvEntryId: string) {
  return kvEntryId.slice(kvEntryId.lastIndexOf(':') + 1)
}

function toStored(item: KvEntry<unknown>, data: Entry): Stored {
  return {
    id: idFromKvId(item.id),
    data,
    version: item.version,
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_by: item.created_by.display_name,
    updated_by: item.updated_by.display_name,
  }
}

function createKvNetworkStore(client: KvClient<unknown>): NetworkStore {
  const versions = createVersionTracker()
  return {
    mode: 'kv',
    async list(gebiet) {
      const entries: Stored[] = []
      const unreadable: string[] = []
      let cursor: string | undefined
      do {
        const page = await client.list({ tags: [gebiet], match: 'all', limit: 500, cursor })
        for (const item of page.items) {
          if (!item.id.startsWith(`${gebiet}:`)) continue
          versions.seen(item.id, item.version)
          const parsed = entrySchema.safeParse(item.data)
          if (parsed.success) entries.push(toStored(item, parsed.data))
          else unreadable.push(item.id)
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return { entries, unreadable }
    },
    async put(gebiet, id, data) {
      const entryId = kvId(gebiet, data, id)
      try {
        const saved = await client.put(
          entryId,
          data,
          [gebiet, kindTags[data.kind]],
          versions.putOptions(entryId),
        )
        versions.saved(entryId, saved.version)
        return toStored(saved, data)
      } catch (error) {
        if (error instanceof KvError && error.code === 'unauthenticated') {
          throw new Error(osmLoginRequiredMessage)
        }
        if (error instanceof KvError && error.code === 'version_conflict') {
          throw new NetworkConflictError()
        }
        throw error
      }
    },
    async listAreas() {
      const { tags } = await client.tags()
      return tags
        .filter(({ tag }) => !reservedTags.has(tag))
        .map(({ tag, count }) => ({ gebiet: tag, count }))
    },
  }
}

const localPrefix = 'na:entries:'

/** Test mode without a KV project: entries stay in this browser's IndexedDB. */
function createLocalNetworkStore(): NetworkStore {
  async function load(gebiet: string) {
    return ((await get(`${localPrefix}${gebiet}`)) ?? {}) as Record<string, Stored>
  }
  return {
    mode: 'lokal',
    async list(gebiet) {
      const stored = await load(gebiet)
      const entries: Stored[] = []
      const unreadable: string[] = []
      for (const [id, item] of Object.entries(stored)) {
        const parsed = entrySchema.safeParse(item.data)
        if (parsed.success) entries.push({ ...item, data: parsed.data })
        else unreadable.push(id)
      }
      return { entries, unreadable }
    },
    async put(gebiet, id, data) {
      const stored = await load(gebiet)
      const now = new Date().toISOString()
      const previous = stored[id]
      const item: Stored = {
        id,
        data,
        version: (previous?.version ?? 0) + 1,
        created_at: previous?.created_at ?? now,
        updated_at: now,
        created_by: previous?.created_by ?? 'lokal',
        updated_by: 'lokal',
      }
      await set(`${localPrefix}${gebiet}`, { ...stored, [id]: item })
      return item
    },
    async listAreas() {
      return []
    },
  }
}

export const kv = createKvClient<unknown>({
  baseUrl: kvBaseUrl,
  project: kvProject,
  apiKey: kvApiKey,
  getOsmToken,
})

export const networkStore: NetworkStore = isKvConfigured()
  ? createKvNetworkStore(kv)
  : createLocalNetworkStore()

export const entriesQueryKey = (gebiet: string) => ['na-entries', gebiet] as const
export const areasQueryKey = ['na-areas'] as const
