import { isValidDatasetName } from '@shared/datasets/dataset-name'
import { z } from 'zod'

/** Tag of the shared "Keine Aktion nötig" decisions; entries also carry the area as a tag. */
export const keineAktionTag = 'keine-aktion'

/** The old per-browser list: `{ [gebiet]: suggestionId[] }` as JSON. */
export const localKeineAktionKey = 'na:no-action-suggestions'

/** A KV batch takes at most 25 puts. */
export const batchSize = 25

/** KV entry ids are `[A-Za-z0-9._:/-]{1,128}`. */
const kvIdMaxLength = 128

/** What a "Keine Aktion nötig" entry holds; the id and tags carry the same, the data is the truth. */
export const keineAktionDataSchema = z.object({
  gebiet: z.string(),
  suggestionId: z.string().min(1),
})

export type KeineAktionData = z.infer<typeof keineAktionDataSchema>

/** A decision as the app shows it. `createdBy` is the OSM display name, or `lokal` in test mode. */
export type KeineAktion = KeineAktionData & {
  createdBy: string
  createdAt: string
}

/**
 * `{gebiet}:keine-aktion:{suggestionId}`. Suggestion ids look like `<element_nr>@<station_m>`, and
 * `@` is not allowed in a KV id, so every character outside the allowed set becomes `:`. The real
 * id stays in `data.suggestionId`. Null when the result is not a valid id.
 */
export function keineAktionEntryId(gebiet: string, suggestionId: string) {
  if (!isValidDatasetName(gebiet) || suggestionId.length === 0) return null
  const id = `${gebiet}:${keineAktionTag}:${suggestionId.replaceAll(/[^A-Za-z0-9._:/-]/g, ':')}`
  return id.length <= kvIdMaxLength ? id : null
}

/** Reads `{ [gebiet]: suggestionId[] }` as stored by the app; null when the shape is not that. */
const idRecordSchema = z.record(z.string(), z.array(z.string()))

export type IdRecord = z.infer<typeof idRecordSchema>

export function parseIdRecord(text: string | null | undefined): IdRecord | null {
  if (text == null) return null
  try {
    const parsed = idRecordSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function countIds(record: IdRecord | null) {
  return Object.values(record ?? {}).reduce((sum, ids) => sum + new Set(ids).size, 0)
}

export function mergeIdRecords(a: IdRecord, b: IdRecord): IdRecord {
  const merged: IdRecord = {}
  for (const record of [a, b]) {
    for (const [gebiet, ids] of Object.entries(record)) {
      merged[gebiet] = [...new Set([...(merged[gebiet] ?? []), ...ids])]
    }
  }
  return merged
}

/** Where decisions are written to and read from; the KV database, or IndexedDB in test mode. */
export type KeineAktionSink = {
  /** Suggestion ids that already have an entry in the area. */
  existing: (gebiet: string) => Promise<Set<string>>
  /** At most `batchSize` items, all or none. */
  putBatch: (items: KeineAktionData[]) => Promise<void>
}

export type TransferResult = {
  /** Newly written. */
  written: number
  /** Skipped because the database has them already. */
  alreadyThere: number
  /** Skipped because they cannot be stored (invalid area name, id too long). */
  ignored: number
}

/** Writes the decisions in batches of 25, without those the database has already. Throws on the first failed batch. */
export async function transferKeineAktion(
  sink: KeineAktionSink,
  byGebiet: IdRecord,
): Promise<TransferResult> {
  const result: TransferResult = { written: 0, alreadyThere: 0, ignored: 0 }
  const todo: KeineAktionData[] = []
  for (const [gebiet, ids] of Object.entries(byGebiet)) {
    const unique = [...new Set(ids)]
    const usable = unique.filter((id) => keineAktionEntryId(gebiet, id) !== null)
    result.ignored += unique.length - usable.length
    if (usable.length === 0) continue
    const existing = await sink.existing(gebiet)
    for (const suggestionId of usable) {
      if (existing.has(suggestionId)) result.alreadyThere += 1
      else todo.push({ gebiet, suggestionId })
    }
  }
  for (let start = 0; start < todo.length; start += batchSize) {
    const batch = todo.slice(start, start + batchSize)
    await sink.putBatch(batch)
    result.written += batch.length
  }
  return result
}

export type StorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

const noStorage: StorageLike = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
}

/** `localStorage`, or an empty stand-in when the browser blocks it. */
export function browserStorage(): StorageLike {
  try {
    return localStorage
  } catch {
    return noStorage
  }
}

/** The old per-browser decisions waiting for the transfer. */
export function readLocalKeineAktion(storage: StorageLike): IdRecord {
  try {
    return parseIdRecord(storage.getItem(localKeineAktionKey)) ?? {}
  } catch {
    return {}
  }
}

export function countLocalKeineAktion(storage: StorageLike) {
  return countIds(readLocalKeineAktion(storage))
}

/**
 * Moves the old per-browser decisions into the database. The local key goes only after every batch
 * succeeded; on an error it stays, so the next start tries again. Null when there is nothing.
 */
export async function takeOverLocalKeineAktion(
  sink: KeineAktionSink,
  storage: StorageLike,
): Promise<TransferResult | null> {
  const local = readLocalKeineAktion(storage)
  if (countIds(local) === 0) return null
  const result = await transferKeineAktion(sink, local)
  storage.removeItem(localKeineAktionKey)
  return result
}
