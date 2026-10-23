import { create } from 'zustand'
import type { SuggestionFilter } from '@/network/suggestions'

const skippedKey = 'na:skipped-suggestions'

/** Skipped suggestions per area. They stay in this browser only; storage may be blocked. */
function loadSkipped(): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(skippedKey) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function saveSkipped(skipped: Record<string, string[]>) {
  try {
    localStorage.setItem(skippedKey, JSON.stringify(skipped))
  } catch {
    // The skips only last for this session then.
  }
}

interface SuggestionStore {
  /** Show the suggestions on the map. */
  visible: boolean
  filter: SuggestionFilter
  skipped: Record<string, string[]>
  /** Id of the suggestion shown in the sidebar. */
  selectedId: string | null
  actions: {
    setVisible: (visible: boolean) => void
    setFilter: (filter: SuggestionFilter) => void
    select: (id: string | null) => void
    skip: (gebiet: string, id: string) => void
    clearSkipped: (gebiet: string) => void
  }
}

const useSuggestionStore = create<SuggestionStore>()((set) => ({
  visible: true,
  filter: 'steil',
  skipped: loadSkipped(),
  selectedId: null,
  actions: {
    setVisible: (visible) => set({ visible }),
    setFilter: (filter) => set({ filter, selectedId: null }),
    select: (selectedId) => set({ selectedId }),
    skip: (gebiet, id) =>
      set((state) => {
        const skipped = { ...state.skipped, [gebiet]: [...(state.skipped[gebiet] ?? []), id] }
        saveSkipped(skipped)
        return { skipped }
      }),
    clearSkipped: (gebiet) =>
      set((state) => {
        const { [gebiet]: _removed, ...skipped } = state.skipped
        saveSkipped(skipped)
        return { skipped }
      }),
  },
}))

export const useSuggestionsVisible = () => useSuggestionStore((state) => state.visible)
export const useSuggestionFilter = () => useSuggestionStore((state) => state.filter)
export const useSkippedSuggestions = () => useSuggestionStore((state) => state.skipped)
export const useSelectedSuggestionId = () => useSuggestionStore((state) => state.selectedId)
export const useSuggestionActions = () => useSuggestionStore((state) => state.actions)
