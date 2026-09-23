import { del, get, keys, set } from 'idb-keyval'
import { z } from 'zod'
import { nodesCollectionSchema, type JunctionNodesGeoJSON } from '@/shared/nodes/schema'
import { suggestionsFileSchema, type SuggestionRow } from '@/shared/suggestions/schema'

const nodesPrefix = 'kp:nodes:'
const suggestionsPrefix = 'kp:suggestions:'

const storedNodesSchema = z.object({
  dataset: z.string(),
  importedAt: z.string(),
  collection: nodesCollectionSchema,
})

const storedSuggestionsSchema = z.object({
  dataset: z.string(),
  importedAt: z.string(),
  rows: suggestionsFileSchema,
})

export type StoredNodes = {
  dataset: string
  importedAt: string
  collection: JunctionNodesGeoJSON
}

export type StoredSuggestions = {
  dataset: string
  importedAt: string
  rows: SuggestionRow[]
}

function nodesKey(dataset: string) {
  return `${nodesPrefix}${dataset}`
}

function suggestionsKey(dataset: string) {
  return `${suggestionsPrefix}${dataset}`
}

function parseStoredNodes(value: unknown): StoredNodes | undefined {
  if (value === undefined) return undefined
  const parsed = storedNodesSchema.safeParse(value)
  return parsed.success ? (parsed.data as StoredNodes) : undefined
}

function parseStoredSuggestions(value: unknown): StoredSuggestions | undefined {
  if (value === undefined) return undefined
  const parsed = storedSuggestionsSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export async function saveNodes(collection: JunctionNodesGeoJSON, dataset: string) {
  const stored: StoredNodes = {
    dataset,
    importedAt: new Date().toISOString(),
    collection: {
      ...collection,
      metadata: { ...collection.metadata, dataset },
    },
  }
  await set(nodesKey(dataset), stored)
  return stored
}

export async function loadNodes(dataset: string): Promise<StoredNodes | null> {
  return parseStoredNodes(await get(nodesKey(dataset))) ?? null
}

export async function listNodesDatasets() {
  const allKeys = await keys()
  const datasetKeys = allKeys.filter(
    (key): key is string => typeof key === 'string' && key.startsWith(nodesPrefix),
  )
  const stored = await Promise.all(datasetKeys.map((key) => get(key)))
  return stored.map(parseStoredNodes).filter((item): item is StoredNodes => item != null)
}

export async function deleteNodes(dataset: string) {
  await del(nodesKey(dataset))
}

export async function saveSuggestions(rows: SuggestionRow[], dataset: string) {
  const stored: StoredSuggestions = {
    dataset,
    importedAt: new Date().toISOString(),
    rows,
  }
  await set(suggestionsKey(dataset), stored)
  return stored
}

export async function loadSuggestions(dataset: string): Promise<StoredSuggestions | null> {
  return parseStoredSuggestions(await get(suggestionsKey(dataset))) ?? null
}

export async function deleteSuggestions(dataset: string) {
  await del(suggestionsKey(dataset))
}

export async function renameLocalArea(oldDataset: string, newDataset: string) {
  const nodes = await loadNodes(oldDataset)
  if (nodes) {
    await saveNodes(nodes.collection, newDataset)
    await deleteNodes(oldDataset)
  }
  const suggestions = await loadSuggestions(oldDataset)
  if (suggestions) {
    await saveSuggestions(suggestions.rows, newDataset)
    await deleteSuggestions(oldDataset)
  }
}
