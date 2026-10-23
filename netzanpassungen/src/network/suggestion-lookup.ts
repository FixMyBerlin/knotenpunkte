import { distanceM } from './geo'
import { queryGridIndex, type Network } from './model'
import { snap } from './snap'
import { passesFilter, type NodeSuggestion, type SuggestionFilter } from './suggestions'

/** A node this close to a suggestion counts as it having been taken over. */
const TAKEN_DISTANCE_M = 3

/** The edge for a suggestion is found within this distance; REN+ wins over the Detailnetz as usual. */
const HOST_TOLERANCE_M = 1

function hasNodeNear(network: Network, suggestion: NodeSuggestion) {
  const { base } = network
  const near = [
    ...queryGridIndex(base.nodeIndex, suggestion.lngLat, TAKEN_DISTANCE_M).map(
      (index) => base.nodes[index]!,
    ),
    ...network.virtualNodes,
  ]
  return near.some((node) => distanceM(node.lngLat, suggestion.lngLat) <= TAKEN_DISTANCE_M)
}

/** Suggestions that pass the filter, were not skipped and have no node yet. */
export function openSuggestions(
  network: Network,
  filter: SuggestionFilter,
  skipped: ReadonlySet<string>,
) {
  return network.base.suggestions.filter(
    (suggestion) =>
      passesFilter(suggestion, filter) &&
      !skipped.has(suggestion.id) &&
      !hasNodeNear(network, suggestion),
  )
}

/** The edge the virtual node would lie on, with the station; null when no edge is there. */
export function suggestionHost(network: Network, suggestion: NodeSuggestion) {
  const target = snap(network, suggestion.lngLat, 0, HOST_TOLERANCE_M)
  return target?.type === 'edge' ? target : null
}
