import type { RatingRecord } from './schema'

export const statusFilters = [
  'all',
  'unrated',
  'deferred',
  'rated',
  'confirmed',
  'corrected',
] as const
export type StatusFilter = (typeof statusFilters)[number]

export function isDeferred(record: RatingRecord | undefined) {
  return record?.status !== 'complete' && record?.Zurueckgestellt === 1
}

export function matchesStatusFilter(record: RatingRecord | undefined, filter: StatusFilter) {
  switch (filter) {
    case 'all':
      return true
    case 'unrated':
      return record?.status !== 'complete' && !isDeferred(record)
    case 'deferred':
      return isDeferred(record)
    case 'rated':
      return record?.status === 'complete'
    case 'confirmed':
      return record?.qa === 'confirmed'
    case 'corrected':
      return record?.qa === 'corrected'
  }
}

// Stepping never lands on a deferred node; those are opened from the list. Only the
// Zurückgestellt filter steps through them.
function isStepTarget(record: RatingRecord | undefined, filter: StatusFilter) {
  return matchesStatusFilter(record, filter) && (filter === 'deferred' || !isDeferred(record))
}

// Walks from the current node's place in the full list, so a node that just left the filter
// (saved, deferred) still leads to its neighbour instead of back to the start.
function stepNodeId(
  nodeIds: string[],
  currentId: string | undefined,
  records: Record<string, RatingRecord | undefined>,
  filter: StatusFilter,
  direction: 1 | -1,
) {
  const count = nodeIds.length
  const index = currentId ? nodeIds.indexOf(currentId) : -1
  const start = index === -1 ? (direction === 1 ? -1 : count) : index
  for (let offset = 1; offset <= count; offset++) {
    const id = nodeIds[(((start + direction * offset) % count) + count) % count]!
    if (id !== currentId && isStepTarget(records[id], filter)) return id
  }
  return currentId !== undefined && index !== -1 && isStepTarget(records[currentId], filter)
    ? currentId
    : undefined
}

export function nextNodeId(
  nodeIds: string[],
  currentId: string | undefined,
  records: Record<string, RatingRecord | undefined>,
  filter: StatusFilter,
) {
  return stepNodeId(nodeIds, currentId, records, filter, 1)
}

export function previousNodeId(
  nodeIds: string[],
  currentId: string | undefined,
  records: Record<string, RatingRecord | undefined>,
  filter: StatusFilter,
) {
  return stepNodeId(nodeIds, currentId, records, filter, -1)
}

export function defaultWorkNodeId(
  nodeIds: string[],
  records: Record<string, RatingRecord | undefined>,
  requested?: string,
) {
  if (requested && nodeIds.includes(requested)) return requested
  return nextNodeId(nodeIds, undefined, records, 'unrated') ?? nodeIds[0]
}
