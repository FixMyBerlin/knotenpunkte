import { kvQueryOptions } from '@shared/kv/query-options'
import type { QueryClient } from '@tanstack/react-query'
import { createRatingStore } from '@/shared/ratings/create-rating-store'

export const ratingStore = createRatingStore()

export const ratingsQueryKey = (dataset: string) => ['ratings', dataset] as const

export const unreadableRatingsQueryKey = (dataset: string) =>
  ['ratings-unreadable', dataset] as const

export const allRatingsQueryKey = ['ratings', 'all'] as const

export const datasetSummariesQueryKey = ['dataset-summaries'] as const

export const projectMetaQueryKey = ['project-meta'] as const

/** The ratings of a dataset from the query cache; only reads from the database when it is stale. */
export function fetchRatings(queryClient: QueryClient, dataset: string) {
  return queryClient.fetchQuery({
    queryKey: ratingsQueryKey(dataset),
    queryFn: () => ratingStore.list(dataset),
    staleTime: kvQueryOptions.staleTime,
  })
}
