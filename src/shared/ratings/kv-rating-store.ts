import { z } from 'zod'
import { KvError, type KvClient } from '@/shared/kv-client'
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
  // Version of each entry as last read or written here. A save sends it along, so the store
  // refuses to overwrite an entry that somebody else changed in the meantime.
  const versions = new Map<string, number>()

  const store: RatingStore = {
    async list(dataset) {
      const records: Record<string, RatingRecord> = {}
      let cursor: string | undefined
      do {
        const page = await client.list({
          tags: [dataset],
          match: 'all',
          limit: 500,
          cursor,
        })
        const prefix = `${dataset}:`
        for (const item of page.items) {
          // A list that was requested before a save of ours may arrive after it.
          versions.set(item.id, Math.max(item.version, versions.get(item.id) ?? 0))
          const record = ratingRecordSchema.safeParse(item.data)
          const nodeId = item.id.startsWith(prefix) ? item.id.slice(prefix.length) : ''
          if (record.success && nodeId) records[nodeId] = record.data
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return records
    },
    async put(dataset, nodeId, record) {
      const id = entryId(dataset, nodeId)
      const version = versions.get(id)
      try {
        const saved = await client.put(
          id,
          record,
          [dataset],
          version === undefined ? undefined : { ifMatch: `"${version}"` },
        )
        versions.set(id, saved.version)
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
      const nodeIds: string[] = []
      const prefix = `${dataset}:`
      let cursor: string | undefined
      do {
        const page = await client.list({ tags: [dataset], match: 'all', limit: 500, cursor })
        for (const item of page.items) {
          if (isReservedMetaEntry(item.id, item.tags)) continue
          if (ratingRecordSchema.safeParse(item.data).success) continue
          nodeIds.push(item.id.startsWith(prefix) ? item.id.slice(prefix.length) : item.id)
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return nodeIds
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
