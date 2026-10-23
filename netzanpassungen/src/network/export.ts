import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import { splitEdges, nodeName } from './element-nr'
import { hostKey, type Network } from './model'
import type { Stored } from './schema'

/** Virtual nodes drawn here, in the shape of `data/Virtuelle-Knotenpunkte.gpkg`. */
export function virtualNodesGeojson(network: Network): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: network.virtualNodes.map((node) => {
      const data = node.stored!.data
      const host = network.edgeByKey(hostKey(data.traeger))
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: node.lngLat },
        properties: {
          'Knotenpunkt-ID': node.name,
          ist_virtuell: 1,
          traeger_netz: data.traeger.art,
          traeger_element_nr: host?.elementNr ?? data.traeger.ref,
          station_m: Math.round(data.traeger.station_m * 100) / 100,
          kommentar: data.kommentar ?? null,
        },
      } satisfies Feature<Point>
    }),
  }
}

/**
 * Edges drawn here. One that has virtual nodes on it goes out in its parts, so every edge ends
 * at a node.
 */
export function newEdgesGeojson(network: Network): FeatureCollection<LineString> {
  const { parts, split, newNumbers } = splitEdges(network)
  const features: Feature<LineString>[] = []
  for (const edge of network.newEdges) {
    const data = edge.stored!.data
    const properties = {
      strassenname: data.strassenname ?? null,
      routen_fernradweg: data.routen_fernradweg ?? null,
      quelle: data.quelle,
      kommentar: data.kommentar ?? null,
    }
    if (split.has(edge.key)) {
      for (const part of parts.filter((item) => item.source.key === edge.key)) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: part.coords },
          properties: {
            element_nr: part.elementNr,
            von_knoten: part.from,
            bis_knoten: part.to,
            laenge_m: Math.round(part.lengthM * 10) / 10,
            ursprung_element_nr: part.sourceElementNr,
            ...properties,
          },
        })
      }
      continue
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: edge.coords },
      properties: {
        element_nr: newNumbers.get(edge.key) ?? null,
        von_knoten: nodeName(network, edge.from),
        bis_knoten: nodeName(network, edge.to),
        laenge_m: Math.round(edge.lengthM * 10) / 10,
        ursprung_element_nr: null,
        ...properties,
      },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** REN+ and Detailnetz edges cut at the virtual nodes drawn here. */
export function splitEdgesGeojson(network: Network): FeatureCollection<LineString> {
  const { parts } = splitEdges(network)
  return {
    type: 'FeatureCollection',
    features: parts
      .filter((part) => part.source.kind !== 'neu')
      .map((part) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: part.coords },
        properties: {
          element_nr: part.elementNr,
          von_knoten: part.from,
          bis_knoten: part.to,
          laenge_m: Math.round(part.lengthM * 10) / 10,
          ursprung_element_nr: part.sourceElementNr,
          netz: part.source.kind,
          strassenname: part.source.strassenname,
        },
      })),
  }
}

/** Every stored entry of the area, deleted ones included, with who changed it when. */
export function entriesFile(gebiet: string, entries: Stored[]) {
  return { gebiet, exported_at: new Date().toISOString(), entries }
}

export function exportFilename(kind: string, gebiet: string, extension: 'geojson' | 'json') {
  const stamp = new Date().toISOString().slice(0, 10)
  return `netzanpassungen-${kind}-${gebiet}-${stamp}.${extension}`
}
