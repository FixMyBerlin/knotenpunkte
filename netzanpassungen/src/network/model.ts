import { lineLengthM, type LngLat } from './geo'
import type { InputFile } from './input-schema'
import type { HostKind, NewEdgeEntry, Stored, VirtualNodeEntry } from './schema'
import { suggestionsOf, type NodeSuggestion } from './suggestions'

/** `amtlich`: Detailnetz node; `bestand`: virtual node of the input file; `neu`: drawn here. */
type NodeKind = 'amtlich' | 'bestand' | 'neu'

export type NetNode = {
  key: string
  name: string
  lngLat: LngLat
  kind: NodeKind
  /** Entry of a node drawn here. */
  stored?: Stored<VirtualNodeEntry>
}

export type NetEdge = {
  /** `ren:<ref>`, `detailnetz:<ref>` or `neu:<entry id>`. */
  key: string
  kind: HostKind
  ref: string
  /** Element number as in the source; for new edges it is derived (see `element-nr.ts`). */
  elementNr: string | null
  from: string | null
  to: string | null
  coords: LngLat[]
  lengthM: number
  verkehrsebene: number
  strassenname: string | null
  radverkehrsnetz: string | null
  stored?: Stored<NewEdgeEntry>
}

/** Buckets of item indices by grid cell, for the few items near a point. */
export type GridIndex = { cells: Map<string, number[]> }

const CELL_DEG = 0.002

function cellKey(ix: number, iy: number) {
  return `${ix}:${iy}`
}

function bboxOf(coords: LngLat[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of coords) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY }
}

function buildGridIndex(items: LngLat[][]): GridIndex {
  const cells = new Map<string, number[]>()
  items.forEach((coords, index) => {
    // Per segment, so a long edge only lands in the cells it passes.
    for (let i = 0; i < Math.max(coords.length - 1, 1); i++) {
      const segment = coords.slice(i, i + 2)
      const { minX, minY, maxX, maxY } = bboxOf(segment)
      for (let ix = Math.floor(minX / CELL_DEG); ix <= Math.floor(maxX / CELL_DEG); ix++) {
        for (let iy = Math.floor(minY / CELL_DEG); iy <= Math.floor(maxY / CELL_DEG); iy++) {
          const key = cellKey(ix, iy)
          const bucket = cells.get(key)
          if (!bucket) cells.set(key, [index])
          else if (bucket[bucket.length - 1] !== index) bucket.push(index)
        }
      }
    }
  })
  return { cells }
}

/** Indices of items in the cells within `radiusM` of the point. */
export function queryGridIndex(index: GridIndex, [lng, lat]: LngLat, radiusM: number) {
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180))
  const found = new Set<number>()
  for (
    let ix = Math.floor((lng - dLng) / CELL_DEG);
    ix <= Math.floor((lng + dLng) / CELL_DEG);
    ix++
  ) {
    for (
      let iy = Math.floor((lat - dLat) / CELL_DEG);
      iy <= Math.floor((lat + dLat) / CELL_DEG);
      iy++
    ) {
      for (const item of index.cells.get(cellKey(ix, iy)) ?? []) found.add(item)
    }
  }
  return [...found]
}

/** The part of the network that comes from the input file. Built once per area. */
export type BaseNetwork = {
  nodes: NetNode[]
  nodeByKey: Map<string, NetNode>
  nodeIndex: GridIndex
  edges: NetEdge[]
  edgeByKey: Map<string, NetEdge>
  edgeIndex: GridIndex
  routes: { name: string; coords: LngLat[] }[]
  routeIndex: GridIndex
  suggestions: NodeSuggestion[]
}

const baseNamesCache = new WeakMap<BaseNetwork, Set<string>>()

/** Ids of all nodes of the input file. */
export function baseNodeNames(base: BaseNetwork) {
  let names = baseNamesCache.get(base)
  if (!names) {
    names = new Set(base.nodes.map((node) => node.name))
    baseNamesCache.set(base, names)
  }
  return names
}

function nodeKeyOf(id: string) {
  return `k:${id}`
}

export function virtualNodeKey(entryId: string) {
  return `v:${entryId}`
}

function asLngLat(position: number[]): LngLat {
  return [position[0]!, position[1]!]
}

/**
 * Line keys of a source: the element number, with `#n` for the second and later lines of the
 * same number (REN+ edges can have several parts) and `ohne#n` for lines without one.
 */
function lineRefs(elementNrs: (string | null | undefined)[]) {
  const seen = new Map<string, number>()
  return elementNrs.map((elementNr) => {
    const base = elementNr || 'ohne'
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 && elementNr ? base : `${base}#${count + 1}`
  })
}

export function buildBaseNetwork(file: InputFile): BaseNetwork {
  const nodes: NetNode[] = file.knoten.features.map((feature) => ({
    key: nodeKeyOf(feature.properties.id),
    name: feature.properties.id,
    lngLat: asLngLat(feature.geometry.coordinates),
    kind: feature.properties.ist_virtuell === 1 ? 'bestand' : 'amtlich',
  }))
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]))

  const renRefs = lineRefs(file.ren_netz.features.map((feature) => feature.properties.element_nr))
  const renEdges: NetEdge[] = file.ren_netz.features.map((feature, index) => {
    const coords = feature.geometry.coordinates.map(asLngLat)
    const { von_knoten, bis_knoten } = feature.properties
    return {
      key: `ren:${renRefs[index]}`,
      kind: 'ren',
      ref: renRefs[index]!,
      elementNr: feature.properties.element_nr ?? null,
      from: von_knoten ? nodeKeyOf(von_knoten) : null,
      to: bis_knoten ? nodeKeyOf(bis_knoten) : null,
      coords,
      lengthM: lineLengthM(coords),
      verkehrsebene: 0,
      strassenname: feature.properties.strassenname ?? null,
      radverkehrsnetz: feature.properties.radverkehrsnetz ?? null,
    }
  })

  const detailRefs = lineRefs(
    file.detailnetz.features.map((feature) => feature.properties.element_nr),
  )
  const detailEdges: NetEdge[] = file.detailnetz.features.map((feature, index) => {
    const coords = feature.geometry.coordinates.map(asLngLat)
    const { beginnt_bei_vp, endet_bei_vp } = feature.properties
    return {
      key: `detailnetz:${detailRefs[index]}`,
      kind: 'detailnetz',
      ref: detailRefs[index]!,
      elementNr: feature.properties.element_nr ?? null,
      from: beginnt_bei_vp ? nodeKeyOf(beginnt_bei_vp) : null,
      to: endet_bei_vp ? nodeKeyOf(endet_bei_vp) : null,
      coords,
      lengthM: lineLengthM(coords),
      verkehrsebene: feature.properties.verkehrsebene ?? 0,
      strassenname: feature.properties.strassenname ?? null,
      radverkehrsnetz: null,
    }
  })

  const edges = [...renEdges, ...detailEdges]
  const routes = file.radfernwege.features.map((feature) => ({
    name: feature.properties.name ?? 'Radfernweg',
    coords: feature.geometry.coordinates.map(asLngLat),
  }))

  return {
    nodes,
    nodeByKey,
    nodeIndex: buildGridIndex(nodes.map((node) => [node.lngLat])),
    edges,
    edgeByKey: new Map(edges.map((edge) => [edge.key, edge])),
    edgeIndex: buildGridIndex(edges.map((edge) => edge.coords)),
    routes,
    routeIndex: buildGridIndex(routes.map((route) => route.coords)),
    suggestions: suggestionsOf(file.knoten_vorschlaege?.features ?? []),
  }
}

/** The whole network: the input file plus the nodes and edges drawn here (not deleted). */
export type Network = {
  base: BaseNetwork
  /** Virtual nodes drawn here. */
  virtualNodes: NetNode[]
  /** Edges drawn here. */
  newEdges: NetEdge[]
  nodeByKey: (key: string) => NetNode | undefined
  edgeByKey: (key: string) => NetEdge | undefined
}

export function newEdgeKey(entryId: string) {
  return `neu:${entryId}`
}

export function buildNetwork(base: BaseNetwork, entries: Stored[]): Network {
  const virtualNodes: NetNode[] = []
  const newEdges: NetEdge[] = []
  for (const stored of entries) {
    if (stored.data.geloescht) continue
    if (stored.data.kind === 'virtual_node') {
      virtualNodes.push({
        key: virtualNodeKey(stored.id),
        name: stored.data.name,
        lngLat: stored.data.lngLat,
        kind: 'neu',
        stored: stored as Stored<VirtualNodeEntry>,
      })
    } else {
      newEdges.push({
        key: newEdgeKey(stored.id),
        kind: 'neu',
        ref: stored.id,
        elementNr: null,
        from: stored.data.von,
        to: stored.data.bis,
        coords: stored.data.coordinates,
        lengthM: lineLengthM(stored.data.coordinates),
        verkehrsebene: 0,
        strassenname: stored.data.strassenname ?? null,
        radverkehrsnetz: null,
        stored: stored as Stored<NewEdgeEntry>,
      })
    }
  }
  newEdges.sort((a, b) => (a.stored!.created_at < b.stored!.created_at ? -1 : 1))
  const virtualByKey = new Map(virtualNodes.map((node) => [node.key, node]))
  const newEdgeByKey = new Map(newEdges.map((edge) => [edge.key, edge]))
  return {
    base,
    virtualNodes,
    newEdges,
    nodeByKey: (key) => virtualByKey.get(key) ?? base.nodeByKey.get(key),
    edgeByKey: (key) => newEdgeByKey.get(key) ?? base.edgeByKey.get(key),
  }
}

/** Key of the edge a virtual node lies on. */
export function hostKey(traeger: VirtualNodeEntry['traeger']) {
  return traeger.art === 'neu' ? newEdgeKey(traeger.ref) : `${traeger.art}:${traeger.ref}`
}

/** Virtual nodes drawn here that lie on the edge, by station. */
export function virtualNodesOn(network: Network, edgeKey: string) {
  return network.virtualNodes
    .filter((node) => node.stored && hostKey(node.stored.data.traeger) === edgeKey)
    .sort((a, b) => a.stored!.data.traeger.station_m - b.stored!.data.traeger.station_m)
}

/** Edges drawn here that end at the node. */
export function edgesAtNode(network: Network, nodeKey: string) {
  return network.newEdges.filter((edge) => edge.from === nodeKey || edge.to === nodeKey)
}

/**
 * The edge a virtual node lies on when the node is also an end of it: the free end of a dead end,
 * drawn with the edge.
 */
export function deadEndHost(network: Network, node: NetNode) {
  const traeger = node.stored?.data.traeger
  if (traeger?.art !== 'neu') return undefined
  const host = network.edgeByKey(hostKey(traeger))
  return host && (host.from === node.key || host.to === node.key) ? host : undefined
}
