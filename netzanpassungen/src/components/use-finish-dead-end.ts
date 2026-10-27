import { useDrawActions, useDrawPoints, useDrawStart } from '@/components/draw-store'
import { useNetwork, useSaveEntries } from '@/components/use-netz'
import { planDeadEnd } from '@/network/edit'
import { Route } from '@/routes/index'

/** Saves the line being drawn as a dead end; it needs a start and at least one point. */
export function useFinishDeadEnd() {
  const { gebiet } = Route.useSearch()
  const { network, ready } = useNetwork(gebiet)
  const save = useSaveEntries(gebiet)
  const start = useDrawStart()
  const points = useDrawPoints()
  const actions = useDrawActions()

  const possible = Boolean(network && ready && start && points.length > 0) && !save.isPending

  function finish() {
    if (!network || !start || points.length === 0 || save.isPending) return
    if (!ready) {
      actions.setMessage({ tone: 'error', text: 'Die gespeicherten Einträge werden noch geladen.' })
      return
    }
    const plan = planDeadEnd(network, start, points)
    save.mutate(plan.writes, { onSuccess: () => actions.finishedDeadEnd(plan.newNodeKeys) })
  }

  return { possible, finish }
}
