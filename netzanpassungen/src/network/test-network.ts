import type { LngLat } from './geo'
import type { InputFile } from './input-schema'
import { buildBaseNetwork, buildNetwork } from './model'
import type { Entry, Stored } from './schema'

/**
 * A small network for tests, west to east along 52.5° N (0.001° ≈ 67.8 m):
 * Detailnetz and REN+ edge `44530016_44530064.01` from A to B (about 136 m), and a Detailnetz
 * edge `44530064_44530070.01` on to C.
 */
export const A: LngLat = [13.4, 52.5]
export const B: LngLat = [13.402, 52.5]
const C: LngLat = [13.404, 52.5]

const fileLines = {
  detailnetz: [
    {
      element_nr: '44530016_44530064.01',
      beginnt_bei_vp: '44530016',
      endet_bei_vp: '44530064',
      coordinates: [A, B],
    },
    {
      element_nr: '44530064_44530070.01',
      beginnt_bei_vp: '44530064',
      endet_bei_vp: '44530070',
      coordinates: [B, C],
    },
  ],
}

const testFile: InputFile = {
  schema: 'netzanpassungen-app/v1',
  gebiet: 'test',
  erzeugt_am: '2026-10-23T00:00:00+00:00',
  quellen: {},
  detailnetz: {
    type: 'FeatureCollection',
    features: fileLines.detailnetz.map(({ coordinates, ...properties }) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { ...properties, strassenname: 'Teststraße', verkehrsebene: 0 },
    })),
  },
  knoten: {
    type: 'FeatureCollection',
    features: [
      ['44530016', A],
      ['44530064', B],
      ['44530070', C],
    ].map(([id, coordinates]) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: coordinates as LngLat },
      properties: { id: id as string, ist_virtuell: 0 },
    })),
  },
  ren_netz: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [A, B] },
        properties: {
          element_nr: '44530016_44530064.01',
          von_knoten: '44530016',
          bis_knoten: '44530064',
          radverkehrsnetz: 'Radvorrangnetz',
          strassenname: 'Teststraße',
        },
      },
    ],
  },
  radfernwege: { type: 'FeatureCollection', features: [] },
  luecken: { type: 'FeatureCollection', features: [] },
}

const testBase = buildBaseNetwork(testFile)

export function stored(id: string, data: Entry, createdAt = '2026-10-23T10:00:00.000Z'): Stored {
  return {
    id,
    data,
    version: 1,
    created_at: createdAt,
    updated_at: createdAt,
    created_by: 'test',
    updated_by: 'test',
  }
}

export function testNetwork(entries: Stored[] = []) {
  return buildNetwork(testBase, entries)
}
