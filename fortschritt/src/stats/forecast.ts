import { paceWindowDays, rampUp } from '@/config/plan.const'
import type { Dataset } from '@/stats/model'
import type { Scope } from '@/stats/status'

type Timed = { t: number; km: number }
type Point = { t: number; km: number }

/** Speed factor of a mapper: 0 before their start, `rampUp.factor` in the start-up phase, then 1. */
export function rampFactor(t: number, mapperStart: number) {
  if (t < mapperStart) return 0
  return t < mapperStart + rampUp.days ? rampUp.factor : 1
}

/** Days between `from` and `to` weighted by the ramp factor (the integral of `rampFactor`). */
export function weightedDays(from: number, to: number, mapperStart: number) {
  const overlap = (a: number, b: number) => Math.max(0, Math.min(to, b) - Math.max(from, a))
  const rampEnd = mapperStart + rampUp.days
  return overlap(mapperStart, rampEnd) * rampUp.factor + overlap(rampEnd, Infinity)
}

/**
 * Full-speed km/week of one mapper: km in the last `windowDays` days ÷ the days of that window
 * weighted by the ramp factor, so a slow first two weeks do not pull the pace down. At least
 * 7 days at start-up speed count, so a single early mark does not look like a huge pace.
 */
function fullSpeedPace(done: Timed[], now: number, windowDays: number, mapperStart: number) {
  const from = Math.max(now - windowDays, mapperStart)
  let km = 0
  // The first mark is the start itself, so it counts.
  for (const item of done) {
    if (item.t >= mapperStart && item.t > now - windowDays && item.t <= now) km += item.km
  }
  const days = Math.max(weightedDays(from, now, mapperStart), 7 * rampUp.factor)
  return (km / days) * 7
}

export type Forecast = {
  /** Day the target of the scope is reached; `null` without any pace. */
  day: number | null
  /** Projected cumulative km from `now`, one point per week and the last at `day`. */
  points: Point[]
}

/** No forecast further than this. */
const horizonDays = 10 * 365

/**
 * Forecast with the start-up phase of each mapper. Every account with edges in the scope starts
 * at its first mark (anywhere); one without a mark starts now at the average full-speed pace of
 * the others. From now on each account adds its full-speed pace times its ramp factor. The km
 * are pooled: the scope is done when the sum reaches its target.
 */
export function rampForecast(dataset: Dataset, scope: Scope, now: number): Forecast {
  const inScope = (delivery: number | null) =>
    delivery !== null && scope.deliveries.includes(delivery)
  const doneNow = dataset.done.filter((item) => item.t <= now)
  let targetKm = 0
  const accounts = new Set<string>()
  for (const edge of dataset.edges) {
    if (!inScope(edge.delivery)) continue
    targetKm += edge.km
    accounts.add(edge.account)
  }
  let doneKm = 0
  for (const item of doneNow) if (inScope(item.delivery)) doneKm += item.km
  if (doneKm >= targetKm) return { day: now, points: [{ t: now, km: doneKm }] }

  const mappers = [...accounts].map((account) => {
    const own = doneNow.filter((item) => item.account === account || item.by === account)
    const start = own.length > 0 ? Math.min(...own.map((item) => item.t)) : null
    const pace =
      start === null
        ? null
        : fullSpeedPace(
            doneNow.filter((item) => item.account === account && inScope(item.delivery)),
            now,
            paceWindowDays.forecast,
            start,
          )
    return { start, pace }
  })
  const known = mappers.flatMap((mapper) => (mapper.pace === null ? [] : [mapper.pace]))
  const average = known.length > 0 ? known.reduce((sum, pace) => sum + pace, 0) / known.length : 0
  const resolved = mappers.map((mapper) => ({
    start: mapper.start ?? now,
    pace: mapper.pace ?? average,
  }))
  if (resolved.every((mapper) => mapper.pace <= 0)) return { day: null, points: [] }

  const points: Point[] = [{ t: now, km: doneKm }]
  let km = doneKm
  for (let day = 0; day < horizonDays; day += 1) {
    const from = now + day
    let step = 0
    for (const mapper of resolved) {
      step += (mapper.pace / 7) * weightedDays(from, from + 1, mapper.start)
    }
    if (km + step >= targetKm) {
      const t = from + (step > 0 ? (targetKm - km) / step : 0)
      points.push({ t, km: targetKm })
      return { day: t, points }
    }
    km += step
    if ((day + 1) % 7 === 0) points.push({ t: from + 1, km })
  }
  return { day: null, points: [] }
}
