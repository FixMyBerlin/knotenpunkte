import { onPlanToleranceKm, paceWindowDays } from '@/config/plan.const'
import { rampForecast } from '@/stats/forecast'
import type { Dataset, DoneEdge, Edge } from '@/stats/model'
import { runningDelivery } from '@/stats/plan'
import {
  cumulativePoints,
  kmUntil,
  paceKmPerWeek,
  sollAt,
  type CumulativePoint,
  type SollSegment,
} from '@/stats/series'

/** What a burn-up and its tiles look at: the whole project or one delivery. */
type ScopeKey = 'gesamt' | `${number}`

export type Scope = {
  key: ScopeKey
  label: string
  /** Delivery numbers in this scope. */
  deliveries: number[]
  segments: SollSegment[]
  /** Deadline of the scope (its last delivery). */
  end: number
}

export function scopes(dataset: Dataset): Scope[] {
  const targetKm = (nr: number) => sumKm(dataset.edges.filter((edge) => edge.delivery === nr))
  const perDelivery = dataset.deliveries.map((delivery): Scope => ({
    key: `${delivery.nr}`,
    label: `Lieferung ${delivery.nr}`,
    deliveries: [delivery.nr],
    segments: [{ from: delivery.sollFrom, to: delivery.deadline, km: targetKm(delivery.nr) }],
    end: delivery.deadline,
  }))
  const gesamt: Scope = {
    key: 'gesamt',
    label: 'Gesamt',
    deliveries: dataset.deliveries.map((delivery) => delivery.nr),
    segments: perDelivery.flatMap((scope) => scope.segments),
    end: Math.max(...dataset.deliveries.map((delivery) => delivery.deadline)),
  }
  return [gesamt, ...perDelivery]
}

/** Scope of the running delivery. */
export function runningScope(dataset: Dataset, now: number): Scope {
  const running = runningDelivery(dataset.deliveries, now)
  const all = scopes(dataset)
  return all.find((scope) => scope.key === `${running.nr}`) ?? all[0]!
}

/** The scope named by the `umfang` search param, else the running delivery. */
export function scopeFromSearch(dataset: Dataset, umfang: string | undefined, now: number) {
  return scopes(dataset).find((scope) => scope.key === umfang) ?? runningScope(dataset, now)
}

export function sumKm(items: { km: number }[]) {
  let km = 0
  for (const item of items) km += item.km
  return km
}

function inScope<T extends Edge>(items: T[], scope: Pick<Scope, 'deliveries'>) {
  return items.filter((item) => item.delivery !== null && scope.deliveries.includes(item.delivery))
}

export type PlanState = 'im-plan' | 'voraus' | 'hinterher'

export type ScopeStatus = {
  scope: Scope
  targetKm: number
  doneKm: number
  /** 0…1 */
  share: number
  edges: number
  edgesDone: number
  sollKm: number
  /** done − Soll; negative is behind. */
  diffKm: number
  planState: PlanState
  /** Weeks from now to the deadline (0 when it is over). */
  weeksLeft: number
  /** Rest ÷ weeks left; `Infinity` after the deadline with work left. */
  neededPerWeek: number
  /** Average of the last 4 weeks, see `paceKmPerWeek`. */
  pace: number
  /** Day the target is reached, with the start-up phase of each mapper; see `rampForecast`. */
  forecast: number | null
  /** Projected cumulative km from now (the dashed line of the burn-up). */
  forecastPoints: { t: number; km: number }[]
  points: CumulativePoint[]
}

export function neededPerWeek(restKm: number, weeksLeft: number) {
  if (restKm <= 0) return 0
  return weeksLeft > 0 ? restKm / weeksLeft : Infinity
}

export function scopeStatus(dataset: Dataset, scope: Scope, now: number): ScopeStatus {
  const edges = inScope(dataset.edges, scope)
  const done: DoneEdge[] = inScope(dataset.done, scope)
  const targetKm = sumKm(edges)
  const doneKm = kmUntil(done, now)
  const sollKm = sollAt(scope.segments, now)
  const diffKm = doneKm - sollKm
  const weeksLeft = Math.max(0, (scope.end - now) / 7)
  const pace = paceKmPerWeek(done, now, paceWindowDays.forecast, dataset.start)
  const forecast = rampForecast(dataset, scope, now)
  return {
    scope,
    targetKm,
    doneKm,
    share: targetKm > 0 ? doneKm / targetKm : 0,
    edges: edges.length,
    edgesDone: done.filter((item) => item.t <= now).length,
    sollKm,
    diffKm,
    planState:
      Math.abs(diffKm) < onPlanToleranceKm ? 'im-plan' : diffKm > 0 ? 'voraus' : 'hinterher',
    weeksLeft,
    neededPerWeek: neededPerWeek(targetKm - doneKm, weeksLeft),
    pace,
    forecast: forecast.day,
    forecastPoints: forecast.points,
    points: cumulativePoints(done, dataset.start, now),
  }
}

export type OverdueDelivery = {
  nr: number
  deadline: number
  targetKm: number
  doneKm: number
  /** > 0 */
  restKm: number
}

/**
 * Deliveries before the running one whose deadline is over but whose edges are not all done
 * (the Rückstand). Marks made after the deadline count as done.
 */
export function overdueDeliveries(dataset: Dataset, now: number): OverdueDelivery[] {
  const running = runningDelivery(dataset.deliveries, now)
  return dataset.deliveries
    .filter((delivery) => delivery.deadline <= now && delivery.deadline < running.deadline)
    .map((delivery) => {
      const targetKm = sumKm(dataset.edges.filter((edge) => edge.delivery === delivery.nr))
      const doneKm = kmUntil(
        dataset.done.filter((item) => item.delivery === delivery.nr),
        now,
      )
      return {
        nr: delivery.nr,
        deadline: delivery.deadline,
        targetKm,
        doneKm,
        restKm: Math.max(0, targetKm - doneKm),
      }
    })
    .filter((item) => item.restKm > 0)
}
