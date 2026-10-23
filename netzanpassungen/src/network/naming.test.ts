import { describe, expect, it } from 'vitest'
import { pointAtStation } from './geo'
import { suggestVirtualNodeName } from './naming'
import { A, B, stored, testNetwork } from './test-network'

const renHost = 'ren:44530016_44530064.01'

describe('suggestVirtualNodeName', () => {
  it('names a node between two Detailnetz nodes V<A>-<B>, as in the 2025 delivery', () => {
    const network = testNetwork()
    const suggestion = suggestVirtualNodeName({
      network,
      host: network.edgeByKey(renHost)!,
      stationM: 40,
    })
    expect(suggestion.name).toBe('V44530016-44530064')
    expect(suggestion.reason).toContain('zwischen 44530016 und 44530064')
  })

  it('names a second node on the same connection after the nearer node, V<N>-2', () => {
    const network = testNetwork([
      stored('first', {
        kind: 'virtual_node',
        name: 'V44530016-44530064',
        name_vorschlag: 'V44530016-44530064',
        lngLat: pointAtStation([A, B], 40),
        traeger: { art: 'ren', ref: '44530016_44530064.01', station_m: 40 },
      }),
    ])
    const suggestion = suggestVirtualNodeName({
      network,
      host: network.edgeByKey(renHost)!,
      stationM: 110,
    })
    expect(suggestion.name).toBe('V44530064-2')
  })

  it('counts on when the numbered name is taken, too', () => {
    const network = testNetwork()
    const suggestion = suggestVirtualNodeName({
      network,
      host: network.edgeByKey(renHost)!,
      stationM: 110,
      extraTaken: ['V44530016-44530064', 'V44530064-2'],
    })
    expect(suggestion.name).toBe('V44530064-3')
  })

  it('finds the Detailnetz nodes behind a virtual node on a new edge', () => {
    const network = testNetwork([
      stored('v1', {
        kind: 'virtual_node',
        name: 'V44530016-44530064',
        name_vorschlag: 'V44530016-44530064',
        lngLat: pointAtStation([A, B], 40),
        traeger: { art: 'ren', ref: '44530016_44530064.01', station_m: 40 },
      }),
      stored('e1', {
        kind: 'new_edge',
        von: 'v:v1',
        bis: 'k:44530070',
        coordinates: [pointAtStation([A, B], 40), [13.403, 52.501], [13.404, 52.5]],
        quelle: 'gezeichnet',
      }),
    ])
    const host = network.edgeByKey('neu:e1')!
    const suggestion = suggestVirtualNodeName({ network, host, stationM: 20 })
    // Behind v1 the nearer Detailnetz node is 44530016 (40 m along the REN+ edge).
    expect(suggestion.name).toBe('V44530016-44530070')
  })
})
