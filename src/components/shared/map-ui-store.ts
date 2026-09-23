import { create } from 'zustand'

interface MapUiStore {
  hoveredNodeId: string | null
  mapBearing: number
  mapPitch: number
  privateRasterUrl: string
  actions: {
    setHoveredNodeId: (nodeId: string | null) => void
    setMapBearing: (bearing: number) => void
    setMapPitch: (pitch: number) => void
    setPrivateRasterUrl: (url: string) => void
  }
}

const useMapUiStore = create<MapUiStore>()((set) => ({
  hoveredNodeId: null,
  mapBearing: 0,
  mapPitch: 0,
  privateRasterUrl: '',
  actions: {
    setHoveredNodeId: (hoveredNodeId) => set({ hoveredNodeId }),
    setMapBearing: (mapBearing) => set({ mapBearing }),
    setMapPitch: (mapPitch) => set({ mapPitch }),
    setPrivateRasterUrl: (privateRasterUrl) => set({ privateRasterUrl }),
  },
}))

export const useHoveredNodeId = () => useMapUiStore((state) => state.hoveredNodeId)
export const useMapBearing = () => useMapUiStore((state) => state.mapBearing)
export const useMapPitch = () => useMapUiStore((state) => state.mapPitch)
export const usePrivateRasterUrl = () => useMapUiStore((state) => state.privateRasterUrl)
export const useMapUiActions = () => useMapUiStore((state) => state.actions)
