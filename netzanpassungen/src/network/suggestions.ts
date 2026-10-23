import type { LngLat } from './geo'

/** A place where a Radfernweg crosses a Detailnetz edge without a node: a virtual node is suggested. */
export type NodeSuggestion = {
  /** Stable across imports of the same data: element number and station. */
  id: string
  lngLat: LngLat
  elementNr: string | null
  strassenname: string | null
  routen: string | null
  winkelGrad: number
  steil: boolean
  lueckeNah: boolean
}

export type SuggestionFilter = 'steil-luecke' | 'steil' | 'alle'

export const suggestionFilterLabels: Record<SuggestionFilter, string> = {
  'steil-luecke': 'Steil und Lücke in der Nähe',
  steil: 'Steil (ab 30°)',
  alle: 'Alle',
}

export function suggestionsOf(
  features: {
    geometry: { coordinates: number[] }
    properties: {
      element_nr?: string | null
      strassenname?: string | null
      routen?: string | null
      winkel_grad: number
      steil: boolean
      luecke_nah: boolean
      station_m: number
    }
  }[],
): NodeSuggestion[] {
  return features.map(({ geometry, properties }) => ({
    id: `${properties.element_nr ?? 'ohne'}@${properties.station_m}`,
    lngLat: [geometry.coordinates[0]!, geometry.coordinates[1]!],
    elementNr: properties.element_nr ?? null,
    strassenname: properties.strassenname ?? null,
    routen: properties.routen || null,
    winkelGrad: properties.winkel_grad,
    steil: properties.steil,
    lueckeNah: properties.luecke_nah,
  }))
}

export function passesFilter(suggestion: NodeSuggestion, filter: SuggestionFilter) {
  if (filter === 'alle') return true
  return suggestion.steil && (filter === 'steil' || suggestion.lueckeNah)
}
