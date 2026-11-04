import type { StepNavItem } from '@shared/components/StepNav'
import { useNavigate } from '@tanstack/react-router'
import { useNow } from '@/data/now-store'
import { useDataset } from '@/data/use-data'
import { Route } from '@/routes/index'
import {
  appViewLabels,
  appViews,
  resolveView,
  type AppView,
  type IndexSearch,
} from '@/routing/search-schema'
import { formatPercent } from '@/stats/format'
import { runningDelivery } from '@/stats/plan'
import { scopes, scopeStatus } from '@/stats/status'

/** Search updates of this page; filters and toggles replace the history entry. */
export function useUpdateSearch() {
  const navigate = useNavigate({ from: Route.fullPath })
  return (patch: Partial<IndexSearch>) =>
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: true })
}

export function useFortschrittNav() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const current = resolveView(search)
  const { dataset } = useDataset()
  const now = useNow()

  function description(view: AppView) {
    if (!dataset) return 'lädt …'
    switch (view) {
      case 'ueberblick': {
        const running = runningDelivery(dataset.deliveries, now)
        const scope = scopes(dataset).find((item) => item.key === `${running.nr}`)
        return scope
          ? `Lieferung ${running.nr}: ${formatPercent(scopeStatus(dataset, scope, now).share)}`
          : ''
      }
      case 'personen':
        return `${dataset.accounts.length} Accounts`
      case 'karte':
        return `${dataset.edges.length.toLocaleString('de-DE')} Kanten`
    }
  }

  const steps: StepNavItem<AppView>[] = appViews.map((id) => ({
    id,
    label: appViewLabels[id],
    description: description(id),
    status: current === id ? 'current' : 'upcoming',
  }))

  function goToView(view: AppView) {
    void navigate({
      search: (previous) => ({ ...previous, view: view === 'ueberblick' ? undefined : view }),
    })
  }

  return { current, steps, goToView }
}
