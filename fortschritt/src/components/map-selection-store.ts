import { create } from 'zustand'

type MapSelection =
  | { kind: 'gebiet'; bezirk: string; account: string; editorUrl: string | null }
  | {
      kind: 'kante'
      id: number
      strasse: string | null
      bezirk: string
      account: string
      editorUrl: string | null
    }

interface MapSelectionStore {
  selection: MapSelection | null
  actions: {
    select: (selection: MapSelection) => void
    clear: () => void
  }
}

const useMapSelectionStore = create<MapSelectionStore>()((set) => ({
  selection: null,
  actions: {
    select: (selection) => set({ selection }),
    clear: () => set({ selection: null }),
  },
}))

export const useMapSelection = () => useMapSelectionStore((state) => state.selection)
export const useMapSelectionActions = () => useMapSelectionStore((state) => state.actions)
