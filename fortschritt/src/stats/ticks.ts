import { dayFromIso, isoFromDay } from '@/stats/time'

/** Round tick values from 0 to at least `max`, about `count` of them (1, 2, 2.5 or 5 × 10ⁿ apart). */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= raw)
  const size = step ?? 10 * magnitude
  const ticks: number[] = []
  for (let value = 0; value < max + size * 0.999; value += size) ticks.push(value)
  return ticks
}

/** First days of the months after `from` up to `to`. */
export function monthStarts(from: number, to: number) {
  const days: number[] = []
  const [year, month] = isoFromDay(from).split('-').map(Number)
  let y = year ?? 1970
  let m = (month ?? 1) + 1
  for (;;) {
    if (m > 12) {
      m = 1
      y += 1
    }
    const day = dayFromIso(`${y}-${String(m).padStart(2, '0')}-01`)
    if (day > to) break
    days.push(day)
    m += 1
  }
  return days
}
