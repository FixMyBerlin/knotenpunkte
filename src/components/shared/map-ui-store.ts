import { create } from 'zustand'

interface MapUiStore {
  /** Last background picked by the user (see `readBackgroundChoice`); `?bg=` takes precedence. */
  backgroundChoice: string
  hoveredNodeId: string | null
  mapBearing: number
  mapPitch: number
  privateRasterUrl: string
  /** Node the photo session's viewpoints belong to; they are found after the streets load. */
  viewpointsNodeId: string | null
  actions: {
    setBackgroundChoice: (choice: string) => void
    setHoveredNodeId: (nodeId: string | null) => void
    setMapBearing: (bearing: number) => void
    setMapPitch: (pitch: number) => void
    setPrivateRasterUrl: (url: string) => void
    setViewpointsNodeId: (nodeId: string | null) => void
  }
}

const useMapUiStore = create<MapUiStore>()((set) => ({
  backgroundChoice: '',
  hoveredNodeId: null,
  mapBearing: 0,
  mapPitch: 0,
  privateRasterUrl: '',
  viewpointsNodeId: null,
  actions: {
    setBackgroundChoice: (backgroundChoice) => set({ backgroundChoice }),
    setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),
    setMapBearing: (mapBearing) => set({ mapBearing }),
    setMapPitch: (mapPitch) => set({ mapPitch }),
    setPrivateRasterUrl: (privateRasterUrl) => set({ privateRasterUrl }),
    setViewpointsNodeId: (viewpointsNodeId) => set({ viewpointsNodeId }),
  },
}))

export const useBackgroundChoice = () => useMapUiStore((state) => state.backgroundChoice)
export const useMapBearing = () => useMapUiStore((state) => state.mapBearing)
export const useMapPitch = () => useMapUiStore((state) => state.mapPitch)
export const usePrivateRasterUrl = () => useMapUiStore((state) => state.privateRasterUrl)
export const useViewpointsNodeId = () => useMapUiStore((state) => state.viewpointsNodeId)
export const useMapUiActions = () => useMapUiStore((state) => state.actions)
