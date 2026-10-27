import { create } from 'zustand'
import type { SuggestionFilter } from '@/network/suggestions'

const skippedKey = 'na:skipped-suggestions'
const noActionKey = 'na:no-action-suggestions'

/** Suggestions per area that were skipped or need no action. They stay in this browser only; storage may be blocked. */
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
  noAction: Record<string, string[]>
  /** Id of the suggestion shown in the sidebar. */
  selectedId: string | null
  actions: {
    setVisible: (visible: boolean) => void
    setFilter: (filter: SuggestionFilter) => void
    select: (id: string | null) => void
    skip: (gebiet: string, id: string) => void
    markNoAction: (gebiet: string, id: string) => void
    clearSkipped: (gebiet: string) => void
  }
}

const useSuggestionStore = create<SuggestionStore>()((set) => ({
  visible: true,
  filter: 'steil',
  skipped: loadIds(skippedKey),
  noAction: loadIds(noActionKey),
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
    markNoAction: (gebiet, id) =>
      set((state) => {
        const noAction = { ...state.noAction, [gebiet]: [...(state.noAction[gebiet] ?? []), id] }
        saveIds(noActionKey, noAction)
        return { noAction }
      }),
    clearSkipped: (gebiet) =>
      set((state) => {
        const { [gebiet]: _skipped, ...skipped } = state.skipped
        const { [gebiet]: _noAction, ...noAction } = state.noAction
        saveIds(skippedKey, skipped)
        saveIds(noActionKey, noAction)
        return { skipped, noAction }
      }),
  },
}))

export const useSuggestionsVisible = () => useSuggestionStore((state) => state.visible)
export const useSuggestionFilter = () => useSuggestionStore((state) => state.filter)
export const useSkippedSuggestions = () => useSuggestionStore((state) => state.skipped)
export const useNoActionSuggestions = () => useSuggestionStore((state) => state.noAction)
export const useSelectedSuggestionId = () => useSuggestionStore((state) => state.selectedId)
export const useSuggestionActions = () => useSuggestionStore((state) => state.actions)
