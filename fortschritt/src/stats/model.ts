import { deliveries as planDeliveries, fallbackStart, type Delivery } from '@/config/plan.const'
import {
  bezirkName,
  deliveryByBezirk,
  resolveDeliveries,
  type ResolvedDelivery,
} from '@/stats/plan'
import { berlinTime, dayFromIso, weekStart } from '@/stats/time'

/** One edge as stored in the cache: only what the numbers need. */
export type EdgeRecord = {
  id: number
  lengthM: number
  /** As in the data, e.g. `"08 - Neukölln"`. */
  bezirk: string
  account: string
}

/** One done mark of the KV db. */
export type MarkRecord = {
  id: string
  createdAt: string
  createdBy: string
}

export type Edge = {
  id: number
  km: number
  /** Without the number, e.g. `"Neukölln"`. */
  bezirk: string
  account: string
  /** `null` when the Bezirk is not in the plan. */
  delivery: number | null
}

export type DoneEdge = Edge & {
  /** Berlin time of `created_at`. */
  t: number
  by: string
}

export type Dataset = {
  edges: Edge[]
  done: DoneEdge[]
  doneById: Map<number, DoneEdge>
  /** Marks whose id is no edge of the network. */
  orphanMarks: number
  /** From the data, sorted `fmc_7`, `fmc_8`, … */
  accounts: string[]
  /** Monday of the week of the first completion. */
  start: number
  deliveries: ResolvedDelivery[]
  /** Bezirke of the data that are not in the plan. */
  unknownBezirke: string[]
  /** Bezirk name → the values in the data (for map filters). */
  rawBezirke: Map<string, string[]>
}

export function sortAccounts(accounts: Iterable<string>) {
  return [...new Set(accounts)].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }))
}

export function buildDataset(
  records: EdgeRecord[],
  marks: MarkRecord[],
  plan: readonly Delivery[] = planDeliveries,
) {
  const deliveryOf = deliveryByBezirk(plan)
  const rawBezirke = new Map<string, string[]>()
  const unknown = new Set<string>()
  const edges: Edge[] = records.map((record) => {
    const bezirk = bezirkName(record.bezirk)
    const raws = rawBezirke.get(bezirk) ?? []
    if (!raws.includes(record.bezirk)) rawBezirke.set(bezirk, [...raws, record.bezirk])
    const delivery = deliveryOf.get(bezirk) ?? null
    if (delivery === null) unknown.add(bezirk)
    return { id: record.id, km: record.lengthM / 1000, bezirk, account: record.account, delivery }
  })
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]))

  const doneById = new Map<number, DoneEdge>()
  let orphanMarks = 0
  for (const mark of marks) {
    const edge = edgeById.get(Number(mark.id))
    if (!edge || !/^\d+$/.test(mark.id)) {
      orphanMarks += 1
      continue
    }
    doneById.set(edge.id, { ...edge, t: berlinTime(mark.createdAt), by: mark.createdBy })
  }
  const done = [...doneById.values()].sort((a, b) => a.t - b.t)
  const first = done[0]
  const start = first ? weekStart(first.t) : dayFromIso(fallbackStart)

  const dataset: Dataset = {
    edges,
    done,
    doneById,
    orphanMarks,
    accounts: sortAccounts(edges.map((edge) => edge.account)),
    start,
    deliveries: resolveDeliveries(plan, start),
    unknownBezirke: [...unknown].sort(),
    rawBezirke,
  }
  return dataset
}
