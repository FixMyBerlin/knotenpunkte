import { create } from 'zustand'
import { berlinTime } from '@/stats/time'

interface NowStore {
  /** Berlin time the numbers are computed for; set on open and on "Neu laden". */
  now: number
  actions: { refresh: () => void }
}

const useNowStore = create<NowStore>()((set) => ({
  now: berlinTime(new Date()),
  actions: { refresh: () => set({ now: berlinTime(new Date()) }) },
}))

export const useNow = () => useNowStore((state) => state.now)
export const useNowActions = () => useNowStore((state) => state.actions)
