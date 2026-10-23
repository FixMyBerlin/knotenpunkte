import { distanceM, nearestOnLine, type LngLat } from './geo'
import { queryGridIndex, type NetEdge, type NetNode, type Network } from './model'

export type SnapTarget =
  | { type: 'node'; node: NetNode; lngLat: LngLat }
  | { type: 'edge'; edge: NetEdge; lngLat: LngLat; stationM: number; distanceM: number }

/** Edges this close to the nearest one count as lying on the same spot; their kind decides. */
const SAME_SPOT_M = 0.5

/** REN+ carries the network nodes (as in 2025), then the Detailnetz, then edges drawn here. */
const hostPriority: Record<NetEdge['kind'], number> = { ren: 0, detailnetz: 1, neu: 2 }

function nearestNode(network: Network, point: LngLat, toleranceM: number) {
  const { base } = network
  let best: { node: NetNode; distance: number } | null = null
  const candidates = [
    ...queryGridIndex(base.nodeIndex, point, toleranceM).map((index) => base.nodes[index]!),
    ...network.virtualNodes,
  ]
  for (const node of candidates) {
    const distance = distanceM(node.lngLat, point)
    if (distance <= toleranceM && (!best || distance < best.distance)) best = { node, distance }
  }
  return best?.node ?? null
}

/** Edges within the tolerance, the best host first (see `SAME_SPOT_M`). */
function edgesNear(network: Network, point: LngLat, toleranceM: number) {
  const { base } = network
  const candidates = [
    ...queryGridIndex(base.edgeIndex, point, toleranceM).map((index) => base.edges[index]!),
    ...network.newEdges,
  ]
  const hits = candidates
    .map((edge) => ({ edge, nearest: nearestOnLine(edge.coords, point) }))
    .filter((hit) => hit.nearest.distanceM <= toleranceM)
  if (hits.length === 0) return []
  const closest = Math.min(...hits.map((hit) => hit.nearest.distanceM))
  return hits.sort((a, b) => {
    const aSame = a.nearest.distanceM <= closest + SAME_SPOT_M
    const bSame = b.nearest.distanceM <= closest + SAME_SPOT_M
    if (aSame !== bSame) return aSame ? -1 : 1
    if (aSame && bSame) {
      const byKind = hostPriority[a.edge.kind] - hostPriority[b.edge.kind]
      if (byKind !== 0) return byKind
      const byLevel = Number(a.edge.verkehrsebene !== 0) - Number(b.edge.verkehrsebene !== 0)
      if (byLevel !== 0) return byLevel
    }
    return a.nearest.distanceM - b.nearest.distanceM
  })
}

/** A node within `nodeToleranceM`, else the best edge within `edgeToleranceM`. */
export function snap(
  network: Network,
  point: LngLat,
  nodeToleranceM: number,
  edgeToleranceM: number,
): SnapTarget | null {
  const node = nearestNode(network, point, nodeToleranceM)
  if (node) return { type: 'node', node, lngLat: node.lngLat }
  const [hit] = edgesNear(network, point, edgeToleranceM)
  if (!hit) return null
  return {
    type: 'edge',
    edge: hit.edge,
    lngLat: hit.nearest.point,
    stationM: hit.nearest.stationM,
    distanceM: hit.nearest.distanceM,
  }
}

/** The nearest point on a Radfernweg, for the points in between. */
export function snapToRoute(network: Network, point: LngLat, toleranceM: number) {
  const { base } = network
  let best: { lngLat: LngLat; distance: number; name: string } | null = null
  for (const index of queryGridIndex(base.routeIndex, point, toleranceM)) {
    const route = base.routes[index]!
    const nearest = nearestOnLine(route.coords, point)
    if (nearest.distanceM <= toleranceM && (!best || nearest.distanceM < best.distance)) {
      best = { lngLat: nearest.point, distance: nearest.distanceM, name: route.name }
    }
  }
  return best
}
