import type { Dataset } from '@/stats/model'
import type { Scope } from '@/stats/status'

/** `deliveries` absent is every delivery (Gesamt). */
export type MapFilter = { deliveries?: number[]; bezirk?: string; account?: string }

/** Map filter for a scope; Gesamt filters no delivery. */
export function mapFilterOf(scope: Scope, rest: Omit<MapFilter, 'deliveries'>): MapFilter {
  return scope.key === 'gesamt' ? rest : { ...rest, deliveries: scope.deliveries }
}

/** Bezirke (names) left by the filter, `null` when all are shown. */
export function filteredBezirke(dataset: Dataset, filter: MapFilter) {
  if (filter.bezirk) return [filter.bezirk]
  if (filter.deliveries) {
    return dataset.deliveries
      .filter((item) => filter.deliveries?.includes(item.nr))
      .flatMap((item) => item.bezirke)
  }
  return null
}

/**
 * MapLibre filter on the `bezirk` and `account` properties of both PMTiles layers; `['all']`
 * (always true) without a filter. The tiles keep the raw Bezirk values (`"08 - Neukölln"`).
 */
export function mapLayerFilter(dataset: Dataset, filter: MapFilter) {
  const conditions: unknown[] = []
  const bezirke = filteredBezirke(dataset, filter)
  if (bezirke) {
    const raw = bezirke.flatMap((name) => dataset.rawBezirke.get(name) ?? [])
    conditions.push(['in', ['get', 'bezirk'], ['literal', raw]])
  }
  if (filter.account) conditions.push(['==', ['get', 'account'], filter.account])
  return ['all', ...conditions]
}

/** `"[Im Editor öffnen](https://…)"` → the URL. */
export function markdownLinkUrl(markdown: unknown) {
  if (typeof markdown !== 'string') return null
  const match = /\]\((https?:\/\/[^)\s]+)\)/.exec(markdown)
  return match?.[1] ?? null
}
