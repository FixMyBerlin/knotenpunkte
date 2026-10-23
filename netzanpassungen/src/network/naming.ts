import { baseNodeNames, hostKey, type NetEdge, type Network } from './model'

/**
 * Naming of new virtual nodes, after the virtual nodes of the 2025 delivery:
 * `V<A>-<B>` where A and B are the network nodes the virtual node lies between (the other ends of
 * the edges meeting there), e.g. `V44530016-44530064`. A second virtual node on the same
 * connection is named after the nearer of the two, `V44530064-2`.
 *
 * A and B are the nearest Detailnetz nodes in both directions along the host edge. Virtual nodes
 * on the way are passed (through the edges drawn here and their own host edges).
 */

type Side = { id: string; distanceM: number }

export type NameSuggestion = {
  name: string
  /** One line on what the name is based on, for the form. */
  reason: string
  a: Side | null
  b: Side | null
}

/** Stop looking for a Detailnetz node after this many steps through virtual nodes. */
const MAX_STEPS = 500

function officialId(network: Network, key: string) {
  const node = network.nodeByKey(key)
  if (node) return node.kind === 'amtlich' ? node.name : null
  // REN+ ends that are not in the node list are Detailnetz nodes, too.
  return key.startsWith('k:') ? key.slice(2) : null
}

type Step = { key: string; distanceM: number; viaEdge: string }

function neighbours(network: Network, key: string): Step[] {
  const steps: Step[] = []
  const node = network.nodeByKey(key)
  const traeger = node?.kind === 'neu' ? node.stored?.data.traeger : undefined
  if (traeger) {
    const host = network.edgeByKey(hostKey(traeger))
    if (host?.from) steps.push({ key: host.from, distanceM: traeger.station_m, viaEdge: host.key })
    if (host?.to) {
      steps.push({ key: host.to, distanceM: host.lengthM - traeger.station_m, viaEdge: host.key })
    }
  }
  for (const edge of network.newEdges) {
    if (edge.from === key && edge.to)
      steps.push({ key: edge.to, distanceM: edge.lengthM, viaEdge: edge.key })
    if (edge.to === key && edge.from) {
      steps.push({ key: edge.from, distanceM: edge.lengthM, viaEdge: edge.key })
    }
  }
  return steps
}

/** The nearest Detailnetz node from `startKey`, not passing `excludeEdge` or `excludeNode`. */
function nearestOfficial(
  network: Network,
  startKey: string | null,
  offsetM: number,
  excludeEdge: string,
  excludeNode: string | undefined,
): Side | null {
  if (!startKey || startKey === excludeNode) return null
  const best = new Map<string, number>([[startKey, offsetM]])
  const done = new Set<string>()
  for (let step = 0; step < MAX_STEPS; step++) {
    let current: string | null = null
    let currentDistance = Infinity
    for (const [key, distance] of best) {
      if (!done.has(key) && distance < currentDistance) {
        current = key
        currentDistance = distance
      }
    }
    if (current === null) return null
    const id = officialId(network, current)
    if (id) return { id, distanceM: currentDistance }
    done.add(current)
    for (const next of neighbours(network, current)) {
      if (next.viaEdge === excludeEdge || next.key === excludeNode) continue
      const distance = currentDistance + next.distanceM
      if (distance < (best.get(next.key) ?? Infinity)) best.set(next.key, distance)
    }
  }
  return null
}

export function takenNodeNames(network: Network, excludeNode?: string) {
  const names = new Set(baseNodeNames(network.base))
  for (const node of network.virtualNodes) {
    if (node.key !== excludeNode) names.add(node.name)
  }
  return names
}

function hostLabel(host: NetEdge, elementNr: string | null) {
  if (host.kind === 'ren') return `REN+-Kante ${host.elementNr ?? host.ref}`
  if (host.kind === 'detailnetz') return `Detailnetzkante ${host.elementNr ?? host.ref}`
  return `neuer Kante ${elementNr ?? ''}`.trim()
}

export function suggestVirtualNodeName({
  network,
  host,
  stationM,
  excludeNode,
  extraTaken = [],
  hostElementNr = null,
}: {
  network: Network
  host: NetEdge
  stationM: number
  /** The node itself, when its name is computed again after a move. */
  excludeNode?: string
  /** Names given in the same step, not stored yet. */
  extraTaken?: string[]
  /** Derived element number of a host drawn here, for the reason line. */
  hostElementNr?: string | null
}): NameSuggestion {
  const taken = takenNodeNames(network, excludeNode)
  for (const name of extraTaken) taken.add(name)

  const a = nearestOfficial(network, host.from, stationM, host.key, excludeNode)
  const b = nearestOfficial(network, host.to, host.lengthM - stationM, host.key, excludeNode)
  const where = `auf ${hostLabel(host, hostElementNr)} bei ${Math.round(stationM)} m`

  if (a && b && a.id !== b.id) {
    const name = `V${a.id}-${b.id}`
    if (!taken.has(name)) {
      return { name, reason: `zwischen ${a.id} und ${b.id} ${where}`, a, b }
    }
  }

  const sides = [a, b].filter((side): side is Side => side !== null)
  const near = sides.sort((x, y) => x.distanceM - y.distanceM)[0]
  const prefix = near ? `V${near.id}` : 'V'
  for (let count = 2; ; count++) {
    const name = `${prefix}-${count}`
    if (taken.has(name)) continue
    const reason = near
      ? a && b && a.id !== b.id
        ? `V${a.id}-${b.id} ist vergeben; neben ${near.id} ${where}`
        : `nur ${near.id} erreichbar ${where}`
      : `kein Detailnetzknoten erreichbar ${where}`
    return { name, reason, a, b }
  }
}
