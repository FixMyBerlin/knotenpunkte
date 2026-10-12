import { useQuery } from '@tanstack/react-query'
import { create } from 'zustand'
import { Route } from '@/routes/index'
import { loadSuggestions } from '@/shared/datasets/dataset-idb'
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'
import { emptyRapidDraft, rapidValuesFromRecord, type RapidDraft } from '@/shared/ratings/schema'
import { applySuggestions } from '@/shared/suggestions/apply'
import { suggestionsForNode } from '@/shared/suggestions/schema'

interface DraftStore {
  /** Unsaved edits, by `dataset:nodeId`. */
  drafts: Record<string, RapidDraft>
  setDraft: (key: string, draft: RapidDraft) => void
  clearDraft: (key: string) => void
}

const useDraftStore = create<DraftStore>()((set) => ({
  drafts: {},
  setDraft: (key, draft) => set((state) => ({ drafts: { ...state.drafts, [key]: draft } })),
  clearDraft: (key) =>
    set((state) => {
      const drafts = { ...state.drafts }
      delete drafts[key]
      return { drafts }
    }),
}))

/**
 * The rating of a node as it is being edited: the unsaved edits, else the saved record, else the
 * suggestions. Shared by the form and the photo viewer, which both write to it.
 */
export function useRatingDraft(nodeId: string | undefined) {
  const dataset = Route.useSearch({ select: (search) => search.dataset })
  const key = `${dataset}:${nodeId}`
  const stored = useDraftStore((state) => state.drafts[key])
  const storeDraft = useDraftStore((state) => state.setDraft)
  const removeDraft = useDraftStore((state) => state.clearDraft)

  const ratingsQuery = useQuery({
    queryKey: ratingsQueryKey(dataset ?? ''),
    queryFn: () => ratingStore.list(dataset!),
    enabled: Boolean(dataset),
  })
  const suggestionsQuery = useQuery({
    queryKey: ['suggestions', dataset],
    queryFn: () => loadSuggestions(dataset!),
    enabled: Boolean(dataset),
  })

  const record = nodeId ? ratingsQuery.data?.[nodeId] : undefined
  const suggestionRows = suggestionsForNode(suggestionsQuery.data?.rows ?? [], nodeId ?? '')
  const draft =
    stored ??
    (record ? rapidValuesFromRecord(record) : applySuggestions(emptyRapidDraft(), suggestionRows))

  return {
    draft,
    setDraft: (next: RapidDraft) => {
      if (dataset && nodeId) storeDraft(key, next)
    },
    clearDraft: () => removeDraft(key),
  }
}
