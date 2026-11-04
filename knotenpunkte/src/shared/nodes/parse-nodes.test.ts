import { describe, expect, it } from 'vitest'
import { parseNodesText } from './parse-nodes'
import { nodeIdFromProperties, UNICODE_HYPHEN } from './schema'

describe('nodeIdFromProperties', () => {
  it('reads NUMMER', () => {
    expect(nodeIdFromProperties({ NUMMER: '32580001' })).toBe('32580001')
  })

  it('reads ASCII Knotenpunkt-ID', () => {
    expect(nodeIdFromProperties({ 'Knotenpunkt-ID': '32580002' })).toBe('32580002')
  })

  it('reads Unicode hyphen Knotenpunkt‐ID (U+2010)', () => {
    expect(nodeIdFromProperties({ [`Knotenpunkt${UNICODE_HYPHEN}ID`]: '32580003' })).toBe(
      '32580003',
    )
  })
})

describe('parseNodesText', () => {
  it('keeps extra properties and accepts MultiPoint', () => {
    const { collection } = parseNodesText(
      JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'MultiPoint', coordinates: [[13.31, 52.5]] },
            properties: { NUMMER: '32580001', okstra_id: 'OK-1', extra: 'keep' },
          },
        ],
      }),
      'berlin-sample',
    )
    expect(collection.features[0]?.properties.id).toBe('32580001')
    expect(collection.features[0]?.properties.extra).toBe('keep')
    expect(collection.metadata?.dataset).toBe('berlin-sample')
  })

  it('rejects missing ids', () => {
    expect(() =>
      parseNodesText(
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [13, 52] },
              properties: { name: 'no-id' },
            },
          ],
        }),
        'berlin-sample',
      ),
    ).toThrow(/ID fehlt/)
  })
})
