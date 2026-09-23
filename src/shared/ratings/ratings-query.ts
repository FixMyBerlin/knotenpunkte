import { createRatingStore } from '@/shared/ratings/create-rating-store'

export const ratingStore = createRatingStore()

export const ratingsQueryKey = (dataset: string) => ['ratings', dataset] as const

export const allRatingsQueryKey = ['ratings', 'all'] as const

export const datasetSummariesQueryKey = ['dataset-summaries'] as const

export const projectMetaQueryKey = ['project-meta'] as const
