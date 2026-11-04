import type { StoredNodes } from './dataset-idb'

export type DatasetSummary = { dataset: string; entryCount: number }

export type DatasetInventoryRow = {
  dataset: string
  local: boolean
  remoteEntryCount: number
  localNodeCount: number | null
  localSuggestionCount: number | null
}

export function buildDatasetInventory(
  local: StoredNodes[],
  summaries: DatasetSummary[],
  suggestionCounts: Record<string, number>,
  metaOnlyDatasets: string[] = [],
) {
  const localByName = new Map(local.map((item) => [item.dataset, item]))
  const remoteByName = new Map(summaries.map((item) => [item.dataset, item.entryCount]))
  const names = [
    ...new Set([...localByName.keys(), ...remoteByName.keys(), ...metaOnlyDatasets]),
  ].sort((a, b) => a.localeCompare(b))

  return names.map((dataset) => {
    const stored = localByName.get(dataset)
    const remoteEntryCount = remoteByName.get(dataset) ?? 0
    if (!stored) {
      return {
        dataset,
        local: false,
        remoteEntryCount,
        localNodeCount: null,
        localSuggestionCount: suggestionCounts[dataset] ?? null,
      }
    }
    return {
      dataset,
      local: true,
      remoteEntryCount,
      localNodeCount: stored.collection.features.length,
      localSuggestionCount: suggestionCounts[dataset] ?? 0,
    }
  })
}

export function datasetInventoryCopy(row: DatasetInventoryRow) {
  if (!row.local) {
    return `${row.remoteEntryCount} Bewertungen in der Datenbank. Keine Knoten in diesem Browser — Datei importieren.`
  }
  const suggestionLine =
    row.localSuggestionCount && row.localSuggestionCount > 0
      ? ` ${row.localSuggestionCount} Vorschläge lokal.`
      : ''
  if (row.remoteEntryCount === 0) {
    return `${row.localNodeCount} Knoten lokal. Noch keine Bewertungen in der Datenbank.${suggestionLine}`
  }
  return `Datenbank: ${row.remoteEntryCount} Bewertungen. Knoten hochgeladen: ${row.localNodeCount}.${suggestionLine}`
}
