import type { Dataset } from '@/stats/model'

export type MapFilter = { lieferung?: string; bezirk?: string; account?: string }

/** Bezirke (names) left by the filter, `null` when all are shown. */
export function filteredBezirke(dataset: Dataset, filter: MapFilter) {
  if (filter.bezirk) return [filter.bezirk]
  if (filter.lieferung) {
    const delivery = dataset.deliveries.find((item) => `${item.nr}` === filter.lieferung)
    return delivery ? [...delivery.bezirke] : []
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
