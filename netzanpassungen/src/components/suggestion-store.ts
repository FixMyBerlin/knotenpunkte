import { create } from 'zustand'
import { skippedKey } from '@/network/backup'
import type { SuggestionFilter } from '@/network/suggestions'

/**
 * Suggestions per area that were skipped: a personal "later" list that stays in this browser only;
 * storage may be blocked. "Keine Aktion nötig" is shared and lives in the KV database.
 */
function loadIds(key: string): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function saveIds(key: string, ids: Record<string, string[]>) {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // They only last for this session then.
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
    /** After a backup was restored into localStorage. */
    reloadSkipped: () => void
  }
}

const useSuggestionStore = create<SuggestionStore>()((set) => ({
  visible: true,
  filter: 'steil',
  skipped: loadIds(skippedKey),
  selectedId: null,
  actions: {
    setVisible: (visible) => set({ visible }),
    setFilter: (filter) => set({ filter, selectedId: null }),
    select: (selectedId) => set({ selectedId }),
    skip: (gebiet, id) =>
      set((state) => {
        const skipped = { ...state.skipped, [gebiet]: [...(state.skipped[gebiet] ?? []), id] }
        saveIds(skippedKey, skipped)
        return { skipped }
      }),
    clearSkipped: (gebiet) =>
      set((state) => {
        const { [gebiet]: _skipped, ...skipped } = state.skipped
        saveIds(skippedKey, skipped)
        return { skipped }
      }),
    reloadSkipped: () => set({ skipped: loadIds(skippedKey) }),
  },
}))

export const useSuggestionsVisible = () => useSuggestionStore((state) => state.visible)
export const useSuggestionFilter = () => useSuggestionStore((state) => state.filter)
export const useSkippedSuggestions = () => useSuggestionStore((state) => state.skipped)
export const useSelectedSuggestionId = () => useSuggestionStore((state) => state.selectedId)
export const useSuggestionActions = () => useSuggestionStore((state) => state.actions)
