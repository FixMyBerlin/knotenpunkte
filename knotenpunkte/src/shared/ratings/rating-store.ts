import type { RatingRecord } from './schema'

type DatasetSummary = { dataset: string; entryCount: number }

export type RatingStoreEntry = {
  dataset: string
  nodeId: string
  record: RatingRecord
}

export type ProjectMeta = {
  dataset: string
  createdAt: string
  createdBy?: string
}

export type RatingStore = {
  list: (dataset: string) => Promise<Record<string, RatingRecord>>
  /** Throws `RatingConflictError` when the entry changed since it was last read here. */
  put: (dataset: string, nodeId: string, record: RatingRecord) => Promise<RatingRecord>
  listDatasetSummaries: () => Promise<DatasetSummary[]>
  listAll: () => Promise<RatingStoreEntry[]>
  /** Node ids whose stored entry does not match the schema; `list` leaves those out. */
  listUnreadable: (dataset: string) => Promise<string[]>
  putProjectMeta: (
    dataset: string,
    meta: { createdAt: string; createdBy?: string },
  ) => Promise<ProjectMeta>
  listProjectMeta: () => Promise<ProjectMeta[]>
}
