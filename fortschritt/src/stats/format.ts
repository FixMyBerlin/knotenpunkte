import { dateOfDay } from '@/stats/time'

const oneDecimal = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const noDecimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 })

/** `80,5`; from 1000 on without decimals (`1.996`). */
export function formatNumber(value: number) {
  return Math.abs(value) >= 1000 ? noDecimal.format(value) : oneDecimal.format(value)
}

export function formatKm(km: number) {
  return `${formatNumber(km)} km`
}

export function formatPercent(share: number) {
  return `${oneDecimal.format(share * 100)} %`
}

export function formatCount(value: number) {
  return noDecimal.format(value)
}

const dayFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDayFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
})
const numericDayFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const stampFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** `1. März 2027` */
export function formatDay(day: number) {
  return dayFormat.format(dateOfDay(Math.floor(day)))
}

/** `01.03.2027` */
export function formatDayNumeric(day: number) {
  return numericDayFormat.format(dateOfDay(Math.floor(day)))
}

/** `26.10.` */
export function formatDayShort(day: number) {
  return `${shortDayFormat.format(dateOfDay(Math.floor(day)))}`
}

/** An instant in Berlin time: `04.11.2026, 23:21` */
export function formatStamp(iso: string) {
  return stampFormat.format(new Date(iso))
}

export function formatWeeks(weeks: number) {
  return `${oneDecimal.format(weeks)} Wochen`
}
