import { useNavigate } from '@tanstack/react-router'
import { useReportScrollActions } from '@/components/report/report-scroll-store'
import type { ReportSectionId } from '@/components/report/sections'
import { useNow } from '@/data/now-store'
import { useDataset } from '@/data/use-data'
import { Route } from '@/routes/index'
import { resolveView, type IndexSearch } from '@/routing/search-schema'
import { formatPercent } from '@/stats/format'
import { runningScope, scopeStatus } from '@/stats/status'

/** Search updates of this page; filters and toggles replace the history entry. */
export function useUpdateSearch() {
  const navigate = useNavigate({ from: Route.fullPath })
  return (patch: Partial<IndexSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true })
}

/** Sidebar navigation: sections of the report and the map. */
export function useFortschrittNav() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const current = resolveView(search)
  const { dataset } = useDataset()
  const now = useNow()
  const { setPending } = useReportScrollActions()

  const running = dataset ? runningScope(dataset, now) : null
  const descriptions = {
    ueberblick:
      dataset && running
        ? `${running.label}: ${formatPercent(scopeStatus(dataset, running, now).share)}`
        : 'lädt …',
    personen: dataset ? `${dataset.accounts.length} Accounts` : 'lädt …',
    karte: dataset ? `${dataset.edges.length.toLocaleString('de-DE')} Kanten` : 'lädt …',
  }

  function goToSection(id: ReportSectionId) {
    if (current === 'karte') {
      setPending(id)
      void navigate({ search: (previous) => ({ ...previous, view: undefined }) })
      return
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function goToMap() {
    void navigate({ search: (previous) => ({ ...previous, view: 'karte' }) })
  }

  return { current, descriptions, goToSection, goToMap }
}
