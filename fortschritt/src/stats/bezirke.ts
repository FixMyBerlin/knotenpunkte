import { deliveries as planDeliveries, type Delivery } from '@/config/plan.const'
import type { Dataset } from '@/stats/model'

type AreaStats = {
  km: number
  doneKm: number
  edges: number
  edgesDone: number
  /** 0…1 */
  share: number
}

export type BezirkRow = AreaStats & { bezirk: string; delivery: number }

function areaStats(dataset: Dataset, match: (edge: Dataset['edges'][number]) => boolean) {
  const stats: AreaStats = { km: 0, doneKm: 0, edges: 0, edgesDone: 0, share: 0 }
  for (const edge of dataset.edges) {
    if (!match(edge)) continue
    stats.km += edge.km
    stats.edges += 1
    if (dataset.doneById.has(edge.id)) {
      stats.doneKm += edge.km
      stats.edgesDone += 1
    }
  }
  stats.share = stats.km > 0 ? stats.doneKm / stats.km : 0
  return stats
}

/** One row per Bezirk of the plan, in plan order. */
export function bezirkRows(dataset: Dataset, plan: readonly Delivery[] = planDeliveries) {
  return plan.flatMap((delivery) =>
    delivery.bezirke.map((bezirk): BezirkRow => ({
      bezirk,
      delivery: delivery.nr,
      ...areaStats(dataset, (edge) => edge.bezirk === bezirk),
    })),
  )
}

/** One Gebiet of the map: the edges of one account in one Bezirk. */
export function gebietStats(dataset: Dataset, bezirk: string, account: string) {
  return areaStats(dataset, (edge) => edge.bezirk === bezirk && edge.account === account)
}
