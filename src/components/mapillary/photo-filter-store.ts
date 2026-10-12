import type { DateRange, PhotoTypeFilter } from '@osm-editor-kit/street-imagery'
import { create } from 'zustand'
import { mapillaryCutoffDate } from '@/config/app.const'

interface PhotoFilterStore {
  /** Capture days of the photos on the map and in the suggested views. */
  date: DateRange
  /** Only 360° or only classic photos; `undefined`: both. */
  photoType: PhotoTypeFilter | undefined
  actions: {
    setDate: (date: DateRange) => void
    setPhotoType: (photoType: PhotoTypeFilter | undefined) => void
  }
}

const usePhotoFilterStore = create<PhotoFilterStore>()((set) => ({
  date: { from: mapillaryCutoffDate },
  photoType: undefined,
  actions: {
    setDate: (date) => set({ date }),
    setPhotoType: (photoType) => set({ photoType }),
  },
}))

export const usePhotoDateFilter = () => usePhotoFilterStore((state) => state.date)
export const usePhotoTypeFilter = () => usePhotoFilterStore((state) => state.photoType)
export const usePhotoFilterActions = () => usePhotoFilterStore((state) => state.actions)
