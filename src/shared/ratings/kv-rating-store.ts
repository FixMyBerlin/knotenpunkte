import { KvError, type KvClient } from '@shared/kv-client'
import { createVersionTracker } from '@shared/kv/version-tracker'
import { z } from 'zod'
import type { ProjectMeta, RatingStore, RatingStoreEntry } from './rating-store'
import { ratingRecordSchema, type RatingRecord } from './schema'

export const osmLoginRequiredMessage = 'Zum Speichern mit OSM anmelden'

/** Somebody else changed the entry since it was loaded; nothing was written. */
export class RatingConflictError extends Error {
  constructor() {
    super(
      'Jemand anderes hat diesen Knoten inzwischen geändert. Der aktuelle Stand wurde geladen – bitte prüfen und erneut speichern.',
    )
    this.name = 'RatingConflictError'
  }
}

const projectMetaTag = 'kp-project-meta'
const metaPrefix = '_meta/'

function entryId(dataset: string, nodeId: string) {
  return `${dataset}:${nodeId}`
}

function metaId(dataset: string) {
  return `${metaPrefix}${dataset}`
}

const projectMetaPayloadSchema = z.object({
  name: z.string(),
  created_at: z.string(),
  created_by: z.string().optional(),
})

function isReservedMetaEntry(id: string, tags: string[]) {
  return id.startsWith(metaPrefix) || tags.includes(projectMetaTag)
}

function rethrowMapped(error: unknown): never {
  if (error instanceof KvError && error.code === 'unauthenticated') {
    throw new Error(osmLoginRequiredMessage)
  }
  if (error instanceof KvError && error.code === 'version_conflict') {
    throw new RatingConflictError()
  }
  throw error
}

function datasetAndNodeFromId(id: string) {
  const colonIndex = id.indexOf(':')
  if (colonIndex <= 0) return null
  const dataset = id.slice(0, colonIndex)
  const nodeId = id.slice(colonIndex + 1)
  if (!dataset || !nodeId) return null
  return { dataset, nodeId }
}

export function createKvRatingStore(client: KvClient<RatingRecord>): RatingStore {
  const versions = createVersionTracker()

  /** One scan of a dataset gives both the records and the unreadable entries. */
  async function scan(dataset: string) {
    const records: Record<string, RatingRecord> = {}
    const unreadable: string[] = []
    const prefix = `${dataset}:`
    let cursor: string | undefined
    do {
      const page = await client.list({ tags: [dataset], match: 'all', limit: 500, cursor })
      for (const item of page.items) {
        versions.seen(item.id, item.version)
        const record = ratingRecordSchema.safeParse(item.data)
        const nodeId = item.id.startsWith(prefix) ? item.id.slice(prefix.length) : ''
        if (record.success && nodeId) records[nodeId] = record.data
        if (isReservedMetaEntry(item.id, item.tags) || record.success) continue
        unreadable.push(nodeId || item.id)
      }
      cursor = page.next_cursor ?? undefined
    } while (cursor)
    return { records, unreadable }
  }

  const scans = new Map<string, Promise<Awaited<ReturnType<typeof scan>>>>()
  const lastUnreadable = new Map<string, string[]>()

  /** Requests for the same dataset that overlap share one scan. */
  function scanShared(dataset: string) {
    const running = scans.get(dataset)
    if (running) return running
    const next = scan(dataset)
      .then((result) => {
        lastUnreadable.set(dataset, result.unreadable)
        return result
      })
      .finally(() => scans.delete(dataset))
    scans.set(dataset, next)
    return next
  }

  const store: RatingStore = {
    async list(dataset) {
      return (await scanShared(dataset)).records
    },
    async put(dataset, nodeId, record) {
      const id = entryId(dataset, nodeId)
      try {
        const saved = await client.put(id, record, [dataset], versions.putOptions(id))
        versions.saved(id, saved.version)
        return record
      } catch (error) {
        rethrowMapped(error)
      }
    },
    async listDatasetSummaries() {
      const { tags } = await client.tags()
      return tags
        .filter(({ tag }) => tag !== projectMetaTag)
        .map(({ tag, count }) => ({ dataset: tag, entryCount: count }))
        .sort((a, b) => a.dataset.localeCompare(b.dataset))
    },
    async listAll() {
      const entries: RatingStoreEntry[] = []
      let cursor: string | undefined
      do {
        const page = await client.list({
          limit: 500,
          cursor,
        })
        for (const item of page.items) {
          if (isReservedMetaEntry(item.id, item.tags)) continue
          const parsedId = datasetAndNodeFromId(item.id)
          if (!parsedId) continue
          const record = ratingRecordSchema.safeParse(item.data)
          if (!record.success) continue
          entries.push({ dataset: parsedId.dataset, nodeId: parsedId.nodeId, record: record.data })
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return entries
    },
    async listUnreadable(dataset) {
      // The latest scan of the dataset, from `list` or an earlier call, is enough.
      return lastUnreadable.get(dataset) ?? (await scanShared(dataset)).unreadable
    },
    async putProjectMeta(dataset, meta) {
      const payload = { name: dataset, created_at: meta.createdAt, created_by: meta.createdBy }
      try {
        await client.put(metaId(dataset), payload as unknown as RatingRecord, [projectMetaTag])
      } catch (error) {
        rethrowMapped(error)
      }
      return { dataset, createdAt: meta.createdAt, createdBy: meta.createdBy }
    },
    async listProjectMeta() {
      const result: ProjectMeta[] = []
      let cursor: string | undefined
      do {
        const page = await client.list({
          tags: [projectMetaTag],
          match: 'all',
          limit: 500,
          cursor,
        })
        for (const item of page.items) {
          if (!item.id.startsWith(metaPrefix)) continue
          const dataset = item.id.slice(metaPrefix.length)
          const parsed = projectMetaPayloadSchema.safeParse(item.data)
          if (!dataset || !parsed.success) continue
          result.push({
            dataset,
            createdAt: parsed.data.created_at,
            createdBy: parsed.data.created_by,
          })
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return result
    },
  }
  return store
}
