import { weekStart } from '@/stats/time'

type Timed = { t: number; km: number }

/** One straight piece of a Soll line: from 0 at `from` up to `km` at `to`. */
export type SollSegment = { from: number; to: number; km: number }

/**
 * Soll at time `t`: the sum of all segments, each rising straight from its start to its
 * deadline. Two segments in a row give the kink of the whole project at the first deadline.
 */
export function sollAt(segments: SollSegment[], t: number) {
  let km = 0
  for (const segment of segments) {
    const span = segment.to - segment.from
    const share = span <= 0 ? (t >= segment.to ? 1 : 0) : (t - segment.from) / span
    km += segment.km * Math.min(1, Math.max(0, share))
  }
  return km
}

export function kmUntil(done: Timed[], t: number) {
  let km = 0
  for (const item of done) if (item.t <= t) km += item.km
  return km
}

/**
 * Average km per week over the last `windowDays` days up to `now`. The window never starts
 * before the project start, and it is at least 7 days long, so the first days of the project
 * do not look like a huge pace. A rolling window has no partial week to distort it.
 */
export function paceKmPerWeek(done: Timed[], now: number, windowDays: number, start: number) {
  const from = Math.max(now - windowDays, start)
  const span = Math.max(now - from, Math.min(windowDays, 7))
  let km = 0
  for (const item of done) if (item.t > from && item.t <= now) km += item.km
  return (km / span) * 7
}

/** Day the target is reached at `pace` km/week from `now`; `null` without any pace. */
export function forecastDay(doneKm: number, targetKm: number, pace: number, now: number) {
  if (doneKm >= targetKm) return now
  if (pace <= 0) return null
  return now + ((targetKm - doneKm) / pace) * 7
}

export type WeekBucket = {
  /** Monday of the week. */
  week: number
  km: number
  edges: number
  /** The week of `now`, not over yet. */
  partial: boolean
}

/** km per calendar week (Monday to Sunday) from the week of `start` to the week of `now`. */
export function weeklyBuckets(done: Timed[], start: number, now: number): WeekBucket[] {
  const first = weekStart(start)
  const last = weekStart(now)
  const buckets: WeekBucket[] = []
  for (let week = first; week <= last; week += 7) {
    buckets.push({ week, km: 0, edges: 0, partial: week === last })
  }
  for (const item of done) {
    if (item.t > now) continue
    const index = (weekStart(item.t) - first) / 7
    const bucket = buckets[index]
    if (!bucket) continue
    bucket.km += item.km
    bucket.edges += 1
  }
  return buckets
}

export type CumulativePoint = { t: number; km: number }

/** Cumulative km at the start, at the end of every full week, and at `now`. */
export function cumulativePoints(done: Timed[], start: number, now: number): CumulativePoint[] {
  const points: CumulativePoint[] = [{ t: start, km: kmUntil(done, start) }]
  for (const bucket of weeklyBuckets(done, start, now)) {
    const end = bucket.partial ? now : bucket.week + 7
    if (end <= start) continue
    points.push({ t: end, km: kmUntil(done, end) })
  }
  return points
}
