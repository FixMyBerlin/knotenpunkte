import { lineLengthM, sliceLine, type LngLat } from './geo'
import { hostKey, virtualNodesOn, type BaseNetwork, type NetEdge, type Network } from './model'

/**
 * Element numbers as in the Detailnetz and in the 2025 delivery: `<von>_<bis>.<nn>`, e.g.
 * `37510001_V37510001-36510009.01`. `nn` counts the edges between the same two nodes, in either
 * direction, including those of the Detailnetz and the REN+. New edges are counted in the order
 * they were drawn. Names of virtual nodes go in as they are now, so a renamed node renames its
 * edges.
 */

const elementNrPattern = /^(.+)_(.+)\.(\d+)$/

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function formatElementNr(from: string, to: string, count: number) {
  return `${from}_${to}.${String(count).padStart(2, '0')}`
}

const baseCountsCache = new WeakMap<BaseNetwork, Map<string, number>>()

/** Highest `nn` per node pair, from the element numbers of the input file (a fresh copy). */
function baseCounts(network: Network) {
  const cached = baseCountsCache.get(network.base)
  if (cached) return new Map(cached)
  const counts = new Map<string, number>()
  for (const edge of network.base.edges) {
    const match = edge.elementNr?.match(elementNrPattern)
    if (!match) continue
    const key = pairKey(match[1]!, match[2]!)
    counts.set(key, Math.max(counts.get(key) ?? 0, Number(match[3])))
  }
  baseCountsCache.set(network.base, counts)
  return new Map(counts)
}

export function nodeName(network: Network, key: string | null) {
  if (!key) return '?'
  return network.nodeByKey(key)?.name ?? (key.startsWith('k:') ? key.slice(2) : '?')
}

function nextElementNr(counts: Map<string, number>, from: string, to: string) {
  const key = pairKey(from, to)
  const count = (counts.get(key) ?? 0) + 1
  counts.set(key, count)
  return formatElementNr(from, to, count)
}

/** Element numbers of the edges drawn here, by edge key. */
export function newEdgeElementNrs(network: Network) {
  const counts = baseCounts(network)
  const numbers = new Map<string, string>()
  for (const edge of network.newEdges) {
    numbers.set(
      edge.key,
      nextElementNr(counts, nodeName(network, edge.from), nodeName(network, edge.to)),
    )
  }
  return numbers
}

type EdgePart = {
  elementNr: string
  from: string
  to: string
  coords: LngLat[]
  lengthM: number
  /** The edge the part belongs to. */
  source: NetEdge
  sourceElementNr: string | null
}

/**
 * Every edge with virtual nodes drawn here on it, cut at those nodes: the edges of the input
 * file and the edges drawn here. Numbers continue after those of `newEdgeElementNrs`.
 */
export function splitEdges(network: Network) {
  const counts = baseCounts(network)
  const newNumbers = new Map<string, string>()
  for (const edge of network.newEdges) {
    newNumbers.set(
      edge.key,
      nextElementNr(counts, nodeName(network, edge.from), nodeName(network, edge.to)),
    )
  }

  const hostKeys = new Set(
    network.virtualNodes.flatMap((node) =>
      node.stored ? [hostKey(node.stored.data.traeger)] : [],
    ),
  )
  const parts: EdgePart[] = []
  const split = new Set<string>()
  // Edges drawn here first, so their parts are numbered like the edges themselves.
  const hosts = [...hostKeys]
    .map((key) => network.edgeByKey(key))
    .filter((edge): edge is NetEdge => edge !== undefined)
    .sort((a, b) => Number(a.kind !== 'neu') - Number(b.kind !== 'neu'))
  for (const edge of hosts) {
    const onEdge = virtualNodesOn(network, edge.key)
    split.add(edge.key)
    const stops = [
      { name: nodeName(network, edge.from), stationM: 0 },
      ...onEdge.map((node) => ({ name: node.name, stationM: node.stored!.data.traeger.station_m })),
      { name: nodeName(network, edge.to), stationM: edge.lengthM },
    ]
    for (let index = 1; index < stops.length; index++) {
      const start = stops[index - 1]!
      const end = stops[index]!
      const coords = sliceLine(edge.coords, start.stationM, end.stationM)
      parts.push({
        elementNr: nextElementNr(counts, start.name, end.name),
        from: start.name,
        to: end.name,
        coords,
        lengthM: lineLengthM(coords),
        source: edge,
        sourceElementNr: edge.kind === 'neu' ? (newNumbers.get(edge.key) ?? null) : edge.elementNr,
      })
    }
  }
  return { parts, split, newNumbers }
}
