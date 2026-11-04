import type { Delivery } from '@/config/plan.const'
import { dayFromIso } from '@/stats/time'

/** `"08 - Neukölln"` → `"Neukölln"`; names without a number stay as they are. */
export function bezirkName(raw: string) {
  return raw.replace(/^\s*\d+\s*-\s*/, '').trim()
}

export type ResolvedDelivery = {
  nr: number
  /** Start of the Soll line: the project start, or the deadline of the delivery before. */
  sollFrom: number
  deadline: number
  abgabe: number
  bezirke: readonly string[]
}

export function resolveDeliveries(plan: readonly Delivery[], start: number): ResolvedDelivery[] {
  const sorted = [...plan].sort((a, b) => a.deadlineMapping.localeCompare(b.deadlineMapping))
  return sorted.map((delivery, index) => {
    const before = sorted[index - 1]
    return {
      nr: delivery.nr,
      sollFrom: before ? dayFromIso(before.deadlineMapping) : start,
      deadline: dayFromIso(delivery.deadlineMapping),
      abgabe: dayFromIso(delivery.abgabe),
      bezirke: delivery.bezirke,
    }
  })
}

/** Delivery number per Bezirk name. */
export function deliveryByBezirk(plan: readonly Delivery[]) {
  const map = new Map<string, number>()
  for (const delivery of plan) {
    for (const bezirk of delivery.bezirke) map.set(bezirk, delivery.nr)
  }
  return map
}

/** The delivery being worked on: the first whose deadline is still ahead, else the last. */
export function runningDelivery(deliveries: ResolvedDelivery[], now: number) {
  const running = deliveries.find((delivery) => delivery.deadline > now) ?? deliveries.at(-1)
  if (!running) throw new Error('Der Lieferplan ist leer')
  return running
}
