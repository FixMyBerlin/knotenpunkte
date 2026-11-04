/**
 * Time as days on the Berlin wall clock: `0` is 1970-01-01 00:00 in Europe/Berlin, `1.5` is
 * 1970-01-02 12:00 there. Every calendar day is exactly 1 long, also on DST days, so weeks and
 * deadlines are plain arithmetic.
 */
const DAY_MS = 86_400_000

const berlinFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** Fractional Berlin day of an instant. */
export function berlinTime(date: Date | string) {
  const instant = typeof date === 'string' ? new Date(date) : date
  const parts: Record<string, number> = {}
  for (const part of berlinFormat.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  const wall = Date.UTC(
    parts.year ?? 1970,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  )
  return wall / DAY_MS
}

/** Day of a calendar date `YYYY-MM-DD` (its start, 00:00 in Berlin). */
export function dayFromIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / DAY_MS
}

/** Calendar date `YYYY-MM-DD` of a day. */
export function isoFromDay(day: number) {
  return new Date(Math.floor(day) * DAY_MS).toISOString().slice(0, 10)
}

/** Monday (start) of the week of a day. */
export function weekStart(day: number) {
  const whole = Math.floor(day)
  const weekday = new Date(whole * DAY_MS).getUTCDay()
  return whole - ((weekday + 6) % 7)
}

/** A day as a `Date` for formatting with `timeZone: 'UTC'`. */
export function dateOfDay(day: number) {
  return new Date(day * DAY_MS)
}
