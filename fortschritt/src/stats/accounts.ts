import { ampelThresholds, paceWindowDays } from '@/config/plan.const'
import type { Dataset } from '@/stats/model'
import { paceKmPerWeek, weeklyBuckets, type WeekBucket } from '@/stats/series'
import { neededPerWeek, runningScope, sumKm, type Scope } from '@/stats/status'

export type Ampel = 'keine' | 'fertig' | 'gruen' | 'gelb' | 'rot'

export const ampelLabels: Record<Ampel, string> = {
  keine: 'nichts zugeteilt',
  fertig: 'fertig',
  gruen: 'im Plan',
  gelb: 'fast im Plan',
  rot: 'braucht mehr Tempo',
}

/** Ampel from the pace and what is needed (both km/week). */
export function ampelFor(restKm: number, pace: number, needed: number): Ampel {
  if (restKm <= 0) return 'fertig'
  if (!Number.isFinite(needed)) return 'rot'
  const ratio = pace / needed
  if (ratio >= ampelThresholds.green) return 'gruen'
  if (ratio >= ampelThresholds.yellow) return 'gelb'
  return 'rot'
}

export type AccountRow = {
  account: string
  /** Label of the scope the row is about, e.g. `Lieferung 2` or `Gesamt`. */
  scopeLabel: string
  totalKm: number
  doneKm: number
  restKm: number
  /**
   * km still open in earlier deliveries outside the scope whose deadline is over (the
   * Rückstand), e.g. Lieferung 2 while Lieferung 3 runs. They count into `neededPerWeek`.
   */
  overdueKm: number
  /** Numbers of the earlier deliveries with `overdueKm` > 0. */
  overdueDeliveries: number[]
  weeksLeft: number
  /** (rest + overdue) ÷ weeks to the deadline of the scope. */
  neededPerWeek: number
  /** km/week in the scope over the last 14 days, see `paceKmPerWeek`. */
  pace: number
  /** pace ÷ needed; `null` when nothing is needed or the deadline is over. */
  ratio: number | null
  ampel: Ampel
  /** Done in deliveries after the scope (counts for them once they run). */
  laterDoneKm: number
  /** Marked by this account in areas of other accounts. */
  foreignKm: number
  foreignEdges: number
  /** km per week in the scope, from the project start. */
  weeks: WeekBucket[]
}

/**
 * One row per account for a scope (one delivery or Gesamt; default the running delivery).
 * Edges count for the account they are assigned to (`account`), not for who marked them;
 * `foreignKm` shows the other view.
 */
export function accountRows(
  dataset: Dataset,
  now: number,
  scope: Scope = runningScope(dataset, now),
): AccountRow[] {
  const outside = dataset.deliveries.filter((delivery) => !scope.deliveries.includes(delivery.nr))
  const later = outside
    .filter((delivery) => delivery.deadline > scope.end)
    .map((delivery) => delivery.nr)
  const earlier = outside.filter(
    (delivery) => delivery.deadline <= now && delivery.deadline < scope.end,
  )
  const inScope = (delivery: number | null) =>
    delivery !== null && scope.deliveries.includes(delivery)
  const weeksLeft = Math.max(0, (scope.end - now) / 7)
  const doneNow = dataset.done.filter((item) => item.t <= now)

  return dataset.accounts.map((account) => {
    const own = dataset.edges.filter((edge) => edge.account === account && inScope(edge.delivery))
    const ownDone = doneNow.filter((item) => item.account === account && inScope(item.delivery))
    const totalKm = sumKm(own)
    const doneKm = sumKm(ownDone)
    const restKm = Math.max(0, totalKm - doneKm)
    const overdue = earlier
      .map((delivery) => ({
        delivery: delivery.nr,
        restKm: Math.max(
          0,
          sumKm(
            dataset.edges.filter(
              (edge) => edge.account === account && edge.delivery === delivery.nr,
            ),
          ) -
            sumKm(
              doneNow.filter((item) => item.account === account && item.delivery === delivery.nr),
            ),
        ),
      }))
      .filter((item) => item.restKm > 0)
    const overdueKm = sumKm(overdue.map((item) => ({ km: item.restKm })))
    const openKm = restKm + overdueKm
    const needed = neededPerWeek(openKm, weeksLeft)
    const pace = paceKmPerWeek(ownDone, now, paceWindowDays.account, dataset.start)
    const foreign = doneNow.filter((item) => item.by === account && item.account !== account)
    return {
      account,
      scopeLabel: scope.label,
      totalKm,
      doneKm,
      restKm,
      overdueKm,
      overdueDeliveries: overdue.map((item) => item.delivery),
      weeksLeft,
      neededPerWeek: needed,
      pace,
      ratio: needed > 0 && Number.isFinite(needed) ? pace / needed : null,
      ampel: totalKm === 0 && overdueKm === 0 ? 'keine' : ampelFor(openKm, pace, needed),
      laterDoneKm: sumKm(
        doneNow.filter(
          (item) =>
            item.account === account && item.delivery !== null && later.includes(item.delivery),
        ),
      ),
      foreignKm: sumKm(foreign),
      foreignEdges: foreign.length,
      weeks: weeklyBuckets(ownDone, dataset.start, now),
    }
  })
}
