import { create } from 'zustand'
import type { ReportSectionId } from '@/components/report/sections'

interface ReportScrollStore {
  /** Section at the top of the report, highlighted in the sidebar. */
  active: ReportSectionId
  /** Section to scroll to once the report is shown (set when leaving the map). */
  pending: ReportSectionId | null
  actions: {
    setActive: (id: ReportSectionId) => void
    setPending: (id: ReportSectionId | null) => void
  }
}

const useReportScrollStore = create<ReportScrollStore>()((set) => ({
  active: 'ueberblick',
  pending: null,
  actions: {
    setActive: (active) => set({ active }),
    setPending: (pending) => set({ pending }),
  },
}))

export const useActiveSection = () => useReportScrollStore((state) => state.active)
export const usePendingSection = () => useReportScrollStore((state) => state.pending)
export const useReportScrollActions = () => useReportScrollStore((state) => state.actions)
