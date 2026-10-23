import { describe, expect, it } from 'vitest'
import { newEdgeElementNrs, splitEdges } from './element-nr'
import { pointAtStation } from './geo'
import { A, B, stored, testNetwork } from './test-network'

describe('newEdgeElementNrs', () => {
  it('counts on after the edges of the input file between the same nodes', () => {
    const network = testNetwork([
      stored('e1', {
        kind: 'new_edge',
        von: 'k:44530064',
        bis: 'k:44530016',
        coordinates: [B, [13.401, 52.501], A],
        quelle: 'gezeichnet',
      }),
    ])
    expect(newEdgeElementNrs(network).get('neu:e1')).toBe('44530064_44530016.02')
  })
})

describe('splitEdges', () => {
  it('cuts the host edge at a virtual node into two numbered parts', () => {
    const network = testNetwork([
      stored('v1', {
        kind: 'virtual_node',
        name: 'V44530016-44530064',
        name_vorschlag: 'V44530016-44530064',
        lngLat: pointAtStation([A, B], 40),
        traeger: { art: 'ren', ref: '44530016_44530064.01', station_m: 40 },
      }),
    ])
    const { parts } = splitEdges(network)
    expect(parts.map((part) => part.elementNr)).toEqual([
      '44530016_V44530016-44530064.01',
      'V44530016-44530064_44530064.01',
    ])
    expect(parts[0]!.lengthM).toBeCloseTo(40, 0)
    expect(parts[0]!.sourceElementNr).toBe('44530016_44530064.01')
  })
})
