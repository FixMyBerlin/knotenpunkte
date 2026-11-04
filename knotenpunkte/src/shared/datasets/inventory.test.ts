import { describe, expect, it } from 'vitest'
import type { JunctionNodesGeoJSON } from '@/shared/nodes/schema'
import type { StoredNodes } from './dataset-idb'
import { buildDatasetInventory, datasetInventoryCopy } from './inventory'

function stored(dataset: string, ids: string[]): StoredNodes {
  const collection: JunctionNodesGeoJSON = {
    type: 'FeatureCollection',
    features: ids.map((id) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [13, 52] },
      properties: { id, NUMMER: id },
    })),
  }
  return { dataset, importedAt: '2026-09-01T00:00:00.000Z', collection }
}

describe('buildDatasetInventory', () => {
  it('unions remote-only, local-only, and both', () => {
    const rows = buildDatasetInventory(
      [stored('local-only', ['a', 'b']), stored('both', ['x'])],
      [
        { dataset: 'remote-only', entryCount: 12 },
        { dataset: 'both', entryCount: 2 },
      ],
      { both: 3, 'local-only': 0 },
      ['meta-only'],
    )
    expect(rows.map((row) => row.dataset)).toEqual([
      'both',
      'local-only',
      'meta-only',
      'remote-only',
    ])
    expect(rows[0]).toMatchObject({ local: true, remoteEntryCount: 2, localNodeCount: 1 })
    expect(rows[2]).toMatchObject({ dataset: 'meta-only', local: false, remoteEntryCount: 0 })
  })
})

describe('datasetInventoryCopy', () => {
  it('describes a remote-only dataset', () => {
    expect(
      datasetInventoryCopy({
        dataset: 'foo',
        local: false,
        remoteEntryCount: 12,
        localNodeCount: null,
        localSuggestionCount: null,
      }),
    ).toContain('12 Bewertungen')
  })
})
