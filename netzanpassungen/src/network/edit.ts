import { distanceM, nearestOnLine, type LngLat } from './geo'
import {
  hostKey,
  newEdgeKey,
  virtualNodeKey,
  virtualNodesOn,
  type NetNode,
  type Network,
} from './model'
import { suggestVirtualNodeName } from './naming'
import {
  newEntryId,
  type Entry,
  type NewEdgeEntry,
  type Stored,
  type VirtualNodeEntry,
} from './schema'
import type { SnapTarget } from './snap'

export type EntryWrite = { id: string; data: Entry }

/** A Radfernweg this close to the middle of a new edge gives its name. */
const ROUTE_NAME_DISTANCE_M = 30

/** The network with a node that is not stored yet, for the next name in the same step. */
function withPendingNode(network: Network, id: string, data: VirtualNodeEntry): Network {
  const now = new Date().toISOString()
  const node: NetNode = {
    key: virtualNodeKey(id),
    name: data.name,
    lngLat: data.lngLat,
    kind: 'neu',
    stored: {
      id,
      data,
      version: 0,
      created_at: now,
      updated_at: now,
      created_by: '',
      updated_by: '',
    },
  }
  return {
    ...network,
    virtualNodes: [...network.virtualNodes, node],
    nodeByKey: (key) => (key === node.key ? node : network.nodeByKey(key)),
  }
}

function routeNameNear(network: Network, coords: LngLat[]) {
  const middle = coords[Math.floor(coords.length / 2)]!
  let best: { name: string; distance: number } | null = null
  for (const route of network.base.routes) {
    const distance = nearestOnLine(route.coords, middle).distanceM
    if (distance <= ROUTE_NAME_DISTANCE_M && (!best || distance < best.distance)) {
      best = { name: route.name, distance }
    }
  }
  return best?.name
}

type EdgeSnapTarget = Extract<SnapTarget, { type: 'edge' }>

/** A virtual node on the edge at the target, named after the rule in `naming.ts`. */
function newVirtualNode(network: Network, target: EdgeSnapTarget, extraTaken: string[]) {
  const suggestion = suggestVirtualNodeName({
    network,
    host: target.edge,
    stationM: target.stationM,
    extraTaken,
  })
  const data: VirtualNodeEntry = {
    kind: 'virtual_node',
    name: suggestion.name,
    name_vorschlag: suggestion.name,
    lngLat: target.lngLat,
    traeger: { art: target.edge.kind, ref: target.edge.ref, station_m: target.stationM },
  }
  return { id: newEntryId(), data }
}

/** The virtual node of a node suggestion; it is the only write. */
export function planSuggestedNode(network: Network, target: EdgeSnapTarget): EntryWrite[] {
  return [newVirtualNode(network, target, [])]
}

export type PlannedEdge = {
  writes: EntryWrite[]
  /** Keys of the virtual nodes created for the ends. */
  newNodeKeys: string[]
  endKey: string
}

/**
 * A new edge from `start` through `points` to `end`. Ends on an edge get a new virtual node there,
 * named after the rule in `naming.ts`. Nodes come first in `writes`, so the edge never points to
 * a node that is not stored.
 */
export function planNewEdge(
  network: Network,
  start: SnapTarget,
  points: LngLat[],
  end: SnapTarget,
): PlannedEdge {
  let current = network
  const writes: EntryWrite[] = []
  const newNodeKeys: string[] = []
  const pendingNames: string[] = []

  function nodeAt(target: SnapTarget) {
    if (target.type === 'node') return target.node.key
    const { id, data } = newVirtualNode(current, target, pendingNames)
    writes.push({ id, data })
    pendingNames.push(data.name)
    current = withPendingNode(current, id, data)
    newNodeKeys.push(virtualNodeKey(id))
    return virtualNodeKey(id)
  }

  const von = nodeAt(start)
  const bis = nodeAt(end)
  const coordinates = [start.lngLat, ...points, end.lngLat]
  const strassenname =
    start.type === 'edge'
      ? start.edge.strassenname
      : end.type === 'edge'
        ? end.edge.strassenname
        : null
  const routeName = routeNameNear(network, coordinates)
  const edge: NewEdgeEntry = {
    kind: 'new_edge',
    von,
    bis,
    coordinates,
    quelle: 'gezeichnet',
    ...(strassenname ? { strassenname } : {}),
    ...(routeName ? { routen_fernradweg: routeName } : {}),
  }
  writes.push({ id: newEntryId(), data: edge })
  return { writes, newNodeKeys, endKey: bis }
}

/** Ends of the edges drawn here that sit on the node follow it to `lngLat`. */
function moveAttachedEnds(network: Network, nodeKey: string, lngLat: LngLat): EntryWrite[] {
  const writes: EntryWrite[] = []
  for (const edge of network.newEdges) {
    if (edge.from !== nodeKey && edge.to !== nodeKey) continue
    const coordinates = [...edge.stored!.data.coordinates]
    if (edge.from === nodeKey) coordinates[0] = lngLat
    if (edge.to === nodeKey) coordinates[coordinates.length - 1] = lngLat
    writes.push({ id: edge.stored!.id, data: { ...edge.stored!.data, coordinates } })
  }
  return writes
}

/**
 * The virtual node moved along its host edge to the point nearest `target`. A name that still
 * equals the suggestion follows the new suggestion; a name given by hand stays.
 */
export function planMoveVirtualNode(network: Network, node: NetNode, target: LngLat): EntryWrite[] {
  const stored = node.stored
  if (!stored) return []
  const host = network.edgeByKey(hostKey(stored.data.traeger))
  if (!host) return []
  const nearest = nearestOnLine(host.coords, target)
  const suggestion = suggestVirtualNodeName({
    network,
    host,
    stationM: nearest.stationM,
    excludeNode: node.key,
  })
  const followsSuggestion = stored.data.name === stored.data.name_vorschlag
  const data: VirtualNodeEntry = {
    ...stored.data,
    lngLat: nearest.point,
    traeger: { ...stored.data.traeger, station_m: nearest.stationM },
    name_vorschlag: suggestion.name,
    name: followsSuggestion ? suggestion.name : stored.data.name,
  }
  return [{ id: stored.id, data }, ...moveAttachedEnds(network, node.key, nearest.point)]
}

/**
 * New points of an edge drawn here. Its ends stay on their nodes; virtual nodes on it move to
 * the nearest point of the new line, with the ends of their edges.
 */
export function planEditEdgeCoords(
  network: Network,
  edgeStored: Stored<NewEdgeEntry>,
  coordinates: LngLat[],
): EntryWrite[] {
  const fixed = [...coordinates]
  fixed[0] = edgeStored.data.coordinates[0]!
  fixed[fixed.length - 1] = edgeStored.data.coordinates[edgeStored.data.coordinates.length - 1]!
  const writes: EntryWrite[] = [
    { id: edgeStored.id, data: { ...edgeStored.data, coordinates: fixed } },
  ]
  for (const node of virtualNodesOn(network, newEdgeKey(edgeStored.id))) {
    const nearest = nearestOnLine(fixed, node.lngLat)
    if (
      distanceM(nearest.point, node.lngLat) < 0.01 &&
      nearest.stationM === node.stored!.data.traeger.station_m
    ) {
      continue
    }
    writes.push({
      id: node.stored!.id,
      data: {
        ...node.stored!.data,
        lngLat: nearest.point,
        traeger: { ...node.stored!.data.traeger, station_m: nearest.stationM },
      },
    })
    writes.push(...moveAttachedEnds(network, node.key, nearest.point))
  }
  return writes
}

/** Why an entry cannot be deleted, or null. */
export function deleteBlocker(network: Network, key: string) {
  if (key.startsWith('neu:')) {
    const hosted = virtualNodesOn(network, key)
    if (hosted.length > 0) {
      return `Auf dieser Kante liegen virtuelle Knoten (${hosted.map((node) => node.name).join(', ')}). Erst die Kanten an diesen Knoten löschen.`
    }
    return null
  }
  if (key.startsWith('v:')) {
    const attached = network.newEdges.filter((edge) => edge.from === key || edge.to === key)
    if (attached.length > 0) return 'An diesem Knoten hängen noch Kanten. Erst die Kanten löschen.'
    return null
  }
  return 'Nur hier gezeichnete Kanten und Knoten lassen sich löschen.'
}

/** Virtual nodes drawn here that have no edge left once `edgeKey` is deleted. */
export function nodesLeftAlone(network: Network, edgeKey: string) {
  const edge = network.edgeByKey(edgeKey)
  if (!edge) return []
  return [edge.from, edge.to]
    .filter((key): key is string => Boolean(key?.startsWith('v:')))
    .filter(
      (key) =>
        network.newEdges.filter(
          (other) => other.key !== edgeKey && (other.from === key || other.to === key),
        ).length === 0,
    )
    .map((key) => network.nodeByKey(key))
    .filter((node): node is NetNode => node !== undefined)
}

export function planDelete(stored: Stored): EntryWrite {
  return { id: stored.id, data: { ...stored.data, geloescht: true } }
}
