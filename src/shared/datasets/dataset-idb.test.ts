import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { JunctionNodesGeoJSON } from '@/shared/nodes/schema'
import {
  deleteNodes,
  listNodesDatasets,
  loadNodes,
  loadSuggestions,
  renameLocalArea,
  saveNodes,
  saveSuggestions,
} from './dataset-idb'

const sampleCollection: JunctionNodesGeoJSON = {
  type: 'FeatureCollection',
  metadata: { dataset: 'placeholder' },
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [13.3115, 52.5076] },
      properties: { id: '32580001', NUMMER: '32580001' },
    },
  ],
}

beforeEach(() => {
  indexedDB = new IDBFactory()
})

describe('loadNodes', () => {
  it('returns null when nothing is stored', async () => {
    expect(await loadNodes('missing')).toBeNull()
  })

  it('returns the stored collection once saved', async () => {
    await saveNodes(sampleCollection, 'berlin-sample')
    const result = await loadNodes('berlin-sample')
    expect(result?.dataset).toBe('berlin-sample')
    expect(result?.collection.features).toHaveLength(1)
  })
})

describe('suggestions', () => {
  it('replaces suggestions for an area on re-upload', async () => {
    await saveSuggestions(
      [{ id: '32580001', attribute: 'Furt_rot', value: 'keine', confidence: 0.5 }],
      'berlin-sample',
    )
    await saveSuggestions(
      [{ id: '32580001', attribute: 'Furt_rot', value: 'gänzlich', confidence: 0.9 }],
      'berlin-sample',
    )
    const stored = await loadSuggestions('berlin-sample')
    expect(stored?.rows).toHaveLength(1)
    expect(stored?.rows[0]?.value).toBe('gänzlich')
  })
})

describe('renameLocalArea', () => {
  it('moves nodes and suggestions', async () => {
    await saveNodes(sampleCollection, 'old-name')
    await saveSuggestions(
      [{ id: '32580001', attribute: 'KP_HVS', value: 1, confidence: 0.4 }],
      'old-name',
    )
    await renameLocalArea('old-name', 'new-name')
    expect(await loadNodes('old-name')).toBeNull()
    expect((await loadNodes('new-name'))?.dataset).toBe('new-name')
    expect((await loadSuggestions('new-name'))?.rows).toHaveLength(1)
    const names = (await listNodesDatasets()).map((item) => item.dataset)
    expect(names).toContain('new-name')
    expect(names).not.toContain('old-name')
  })
})

describe('deleteNodes', () => {
  it('is a no-op when nothing is stored', async () => {
    await expect(deleteNodes('never-stored')).resolves.toBeUndefined()
  })
})
