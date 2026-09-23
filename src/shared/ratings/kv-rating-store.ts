import { z } from 'zod'
import { KvError, type KvClient } from '@/shared/kv-client'
import type { ProjectMeta, RatingStore, RatingStoreEntry, RawRatingEntry } from './rating-store'
import { ratingRecordSchema, type RatingRecord } from './schema'

export const osmLoginRequiredMessage = 'Zum Speichern mit OSM anmelden'

export const projectMetaTag = 'kp-project-meta'
const metaPrefix = '_meta/'

export function entryId(dataset: string, nodeId: string) {
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
          const record = ratingRecordSchema.safeParse(item.data)
          const nodeId = item.id.startsWith(prefix) ? item.id.slice(prefix.length) : ''
          if (record.success && nodeId) records[nodeId] = record.data
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return records
    },
    async get(dataset, nodeId) {
      try {
        const item = await client.get(entryId(dataset, nodeId))
        const record = ratingRecordSchema.safeParse(item.data)
        return record.success ? record.data : undefined
      } catch (error) {
        if (error instanceof KvError && error.code === 'not_found') return undefined
        throw error
      }
    },
    async put(dataset, nodeId, record) {
      try {
        await client.put(entryId(dataset, nodeId), record, [dataset])
        return record
      } catch (error) {
        rethrowMapped(error)
      }
    },
    async remove(dataset, nodeId) {
      try {
        await client.remove(entryId(dataset, nodeId))
      } catch (error) {
        if (error instanceof KvError && error.code === 'not_found') return
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
    async listRawEntries(dataset) {
      const raw: RawRatingEntry[] = []
      const prefix = `${dataset}:`
      let cursor: string | undefined
      do {
        const page = await client.list({
          tags: [dataset],
          match: 'all',
          limit: 500,
          cursor,
        })
        for (const item of page.items) {
          if (isReservedMetaEntry(item.id, item.tags)) continue
          const nodeId = item.id.startsWith(prefix) ? item.id.slice(prefix.length) : item.id
          const record = ratingRecordSchema.safeParse(item.data)
          raw.push({
            id: item.id,
            nodeId,
            valid: record.success,
            record: record.success ? record.data : undefined,
            raw: item.data,
            updatedAt: item.updated_at,
            version: item.version,
          })
        }
        cursor = page.next_cursor ?? undefined
      } while (cursor)
      return raw
    },
    async getProjectMeta(dataset) {
      try {
        const item = await client.get(metaId(dataset))
        const parsed = projectMetaPayloadSchema.safeParse(item.data)
        if (!parsed.success) return undefined
        return { dataset, createdAt: parsed.data.created_at, createdBy: parsed.data.created_by }
      } catch (error) {
        if (error instanceof KvError && error.code === 'not_found') return undefined
        throw error
      }
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
    async removeProjectMeta(dataset) {
      try {
        await client.remove(metaId(dataset))
      } catch (error) {
        if (error instanceof KvError && error.code === 'not_found') return
        rethrowMapped(error)
      }
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
