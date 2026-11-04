import { ampelThresholds, paceWindowDays } from '@/config/plan.const'
import type { Dataset } from '@/stats/model'
import { runningDelivery } from '@/stats/plan'
import { paceKmPerWeek, weeklyBuckets, type WeekBucket } from '@/stats/series'
import { neededPerWeek, sumKm } from '@/stats/status'

export type Ampel = 'fertig' | 'gruen' | 'gelb' | 'rot'

export const ampelLabels: Record<Ampel, string> = {
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
  weeksLeft: number
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
    const needed = neededPerWeek(restKm, weeksLeft)
    const pace = paceKmPerWeek(ownDone, now, paceWindowDays.account, dataset.start)
    const foreign = doneNow.filter((item) => item.by === account && item.account !== account)
    return {
      account,
      delivery: running.nr,
      totalKm,
      doneKm,
      restKm,
      weeksLeft,
      neededPerWeek: needed,
      pace,
      ratio: needed > 0 && Number.isFinite(needed) ? pace / needed : null,
      ampel: ampelFor(restKm, pace, needed),
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
