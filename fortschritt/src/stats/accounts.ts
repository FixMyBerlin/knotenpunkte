import { ampelThresholds, paceWindowDays } from '@/config/plan.const'
import type { Dataset } from '@/stats/model'
import { runningDelivery } from '@/stats/plan'
import { paceKmPerWeek, weeklyBuckets, type WeekBucket } from '@/stats/series'
import { neededPerWeek, sumKm } from '@/stats/status'

export type Ampel = 'keine' | 'fertig' | 'gruen' | 'gelb' | 'rot'

export const ampelLabels: Record<Ampel, string> = {
  keine: 'nichts zugeteilt',
  fertig: 'fertig',
  gruen: 'schnell genug',
  gelb: 'knapp',
  rot: 'zu langsam',
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
  /** Number of the running delivery. */
  delivery: number
  totalKm: number
  doneKm: number
  restKm: number
  /**
   * km still open in earlier deliveries whose deadline is over (the Rückstand), e.g. Lieferung 2
   * while Lieferung 3 runs. They count into `neededPerWeek`.
   */
  overdueKm: number
  /** Numbers of the earlier deliveries with `overdueKm` > 0. */
  overdueDeliveries: number[]
  weeksLeft: number
  /** (rest + overdue) ÷ weeks to the deadline of the running delivery. */
  neededPerWeek: number
  /** km/week in the running delivery over the last 14 days, see `paceKmPerWeek`. */
  pace: number
  /** pace ÷ needed; `null` when nothing is needed or the deadline is over. */
  ratio: number | null
  ampel: Ampel
  /** Done in later deliveries (counts for them once they run). */
  laterDoneKm: number
  /** Marked by this account in areas of other accounts. */
  foreignKm: number
  foreignEdges: number
  /** km per week in the running delivery, from the project start. */
  weeks: WeekBucket[]
}

/**
 * One row per account. Edges count for the account they are assigned to (`account`), not for
 * who marked them; `foreignKm` shows the other view.
 */
export function accountRows(dataset: Dataset, now: number): AccountRow[] {
  const running = runningDelivery(dataset.deliveries, now)
  const later = dataset.deliveries
    .filter((delivery) => delivery.deadline > running.deadline)
    .map((delivery) => delivery.nr)
  const earlier = dataset.deliveries.filter(
    (delivery) => delivery.deadline <= now && delivery.deadline < running.deadline,
  )
  const weeksLeft = Math.max(0, (running.deadline - now) / 7)
  const doneNow = dataset.done.filter((item) => item.t <= now)

  return dataset.accounts.map((account) => {
    const own = dataset.edges.filter(
      (edge) => edge.account === account && edge.delivery === running.nr,
    )
    const ownDone = doneNow.filter(
      (item) => item.account === account && item.delivery === running.nr,
    )
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
      delivery: running.nr,
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
