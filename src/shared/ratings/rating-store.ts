import type { RatingRecord } from './schema'

export type DatasetSummary = { dataset: string; entryCount: number }

export type RatingStoreEntry = {
  dataset: string
  nodeId: string
  record: RatingRecord
}

export type RawRatingEntry = {
  id: string
  nodeId: string
  valid: boolean
  record: RatingRecord | undefined
  raw: unknown
  updatedAt: string
  version: number
}

export type ProjectMeta = {
  dataset: string
  createdAt: string
  createdBy?: string
}

export type RatingStore = {
  list: (dataset: string) => Promise<Record<string, RatingRecord>>
  get: (dataset: string, nodeId: string) => Promise<RatingRecord | undefined>
  put: (dataset: string, nodeId: string, record: RatingRecord) => Promise<RatingRecord>
  remove: (dataset: string, nodeId: string) => Promise<void>
  listDatasetSummaries: () => Promise<DatasetSummary[]>
  listAll: () => Promise<RatingStoreEntry[]>
  listRawEntries: (dataset: string) => Promise<RawRatingEntry[]>
  getProjectMeta: (dataset: string) => Promise<ProjectMeta | undefined>
  putProjectMeta: (
    dataset: string,
    meta: { createdAt: string; createdBy?: string },
  ) => Promise<ProjectMeta>
  removeProjectMeta: (dataset: string) => Promise<void>
  listProjectMeta: () => Promise<ProjectMeta[]>
}
