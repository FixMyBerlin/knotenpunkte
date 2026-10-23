import type { PrivateRaster } from '@shared/map/private-raster'
import { create } from 'zustand'

interface MapUiStore {
  /** Last background picked by the user (see `readBackgroundChoice`); `?bg=` takes precedence. */
  backgroundChoice: string
  mapBearing: number
  mapPitch: number
  /** Private backgrounds of this browser (see `readPrivateRasters`). */
  privateRasters: PrivateRaster[]
  /** Node the photo session's viewpoints belong to; they are found after the streets load. */
  viewpointsNodeId: string | null
  actions: {
    setBackgroundChoice: (choice: string) => void
    setMapBearing: (bearing: number) => void
    setMapPitch: (pitch: number) => void
    setPrivateRasters: (rasters: PrivateRaster[]) => void
    setViewpointsNodeId: (nodeId: string | null) => void
  }
}

const useMapUiStore = create<MapUiStore>()((set) => ({
  backgroundChoice: '',
  mapBearing: 0,
  mapPitch: 0,
  privateRasters: [],
  viewpointsNodeId: null,
  actions: {
    setBackgroundChoice: (backgroundChoice) => set({ backgroundChoice }),
    setMapBearing: (mapBearing) => set({ mapBearing }),
    setMapPitch: (mapPitch) => set({ mapPitch }),
    setPrivateRasters: (privateRasters) => set({ privateRasters }),
    setViewpointsNodeId: (viewpointsNodeId) => set({ viewpointsNodeId }),
  },
}))

export const useBackgroundChoice = () => useMapUiStore((state) => state.backgroundChoice)
export const useMapBearing = () => useMapUiStore((state) => state.mapBearing)
export const useMapPitch = () => useMapUiStore((state) => state.mapPitch)
export const usePrivateRasters = () => useMapUiStore((state) => state.privateRasters)
export const useViewpointsNodeId = () => useMapUiStore((state) => state.viewpointsNodeId)
export const useMapUiActions = () => useMapUiStore((state) => state.actions)
