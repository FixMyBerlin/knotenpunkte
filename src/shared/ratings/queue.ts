import type { RatingRecord } from './schema'

export const statusFilters = ['all', 'unrated', 'rated', 'confirmed', 'corrected'] as const
export type StatusFilter = (typeof statusFilters)[number]

export function matchesStatusFilter(record: RatingRecord | undefined, filter: StatusFilter) {
  switch (filter) {
    case 'all':
      return true
    case 'unrated':
      return record?.status !== 'complete'
    case 'rated':
      return record?.status === 'complete'
    case 'confirmed':
      return record?.qa === 'confirmed'
    case 'corrected':
      return record?.qa === 'corrected'
  }
}

export function filterNodeIds(
  nodeIds: string[],
  records: Record<string, RatingRecord | undefined>,
  filter: StatusFilter,
) {
  return nodeIds.filter((id) => matchesStatusFilter(records[id], filter))
}

export function nextNodeId(
  nodeIds: string[],
  currentId: string | undefined,
  records: Record<string, RatingRecord | undefined>,
  filter: StatusFilter,
) {
  const filtered = filterNodeIds(nodeIds, records, filter)
  if (filtered.length === 0) return undefined
  if (!currentId) return filtered[0]
  const index = filtered.indexOf(currentId)
  if (index === -1) return filtered[0]
  return filtered[(index + 1) % filtered.length]
}

export function previousNodeId(
  nodeIds: string[],
  currentId: string | undefined,
  records: Record<string, RatingRecord | undefined>,
  filter: StatusFilter,
) {
  const filtered = filterNodeIds(nodeIds, records, filter)
  if (filtered.length === 0) return undefined
  if (!currentId) return filtered[filtered.length - 1]
  const index = filtered.indexOf(currentId)
  if (index === -1) return filtered[filtered.length - 1]
  return filtered[(index - 1 + filtered.length) % filtered.length]
}

export function defaultWorkNodeId(
  nodeIds: string[],
  records: Record<string, RatingRecord | undefined>,
  requested?: string,
) {
  if (requested && nodeIds.includes(requested)) return requested
  return nextNodeId(nodeIds, undefined, records, 'unrated') ?? nodeIds[0]
}
