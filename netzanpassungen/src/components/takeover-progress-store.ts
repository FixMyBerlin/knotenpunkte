import { create } from 'zustand'

type Progress = { done: number; total: number }

interface TakeoverProgressStore {
  /** Markings written so far; null before the transfer knows how many there are to write. */
  progress: Progress | null
  actions: {
    set: (done: number, total: number) => void
    reset: () => void
  }
}

const useTakeoverProgressStore = create<TakeoverProgressStore>()((set) => ({
  progress: null,
  actions: {
    set: (done, total) => set({ progress: { done, total } }),
    reset: () => set({ progress: null }),
  },
}))

export const useTakeoverProgress = () => useTakeoverProgressStore((state) => state.progress)
export const useTakeoverProgressActions = () => useTakeoverProgressStore((state) => state.actions)
