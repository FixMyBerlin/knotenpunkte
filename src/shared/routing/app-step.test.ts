import { describe, expect, it } from 'vitest'
import type { JunctionNodesGeoJSON } from '@/shared/nodes/schema'
import { resolveStep, stepDescription } from './app-step'

const nodes = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [13, 52] },
      properties: { id: 'a', NUMMER: 'a' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [13.1, 52.1] },
      properties: { id: 'b', NUMMER: 'b' },
    },
  ],
} as JunctionNodesGeoJSON

describe('resolveStep', () => {
  it('uses an explicit step when set', () => {
    expect(resolveStep({ step: 'export', dataset: 'x' })).toBe('export')
    expect(resolveStep({ step: 'dataset' })).toBe('dataset')
  })

  it('defaults to work when a dataset is set', () => {
    expect(resolveStep({ dataset: 'berlin-sample' })).toBe('work')
  })

  it('defaults to dataset without a dataset', () => {
    expect(resolveStep({})).toBe('dataset')
  })
})

describe('stepDescription', () => {
  it('describes dataset', () => {
    expect(stepDescription({ step: 'dataset' })).toBe('Kein Datensatz')
    expect(stepDescription({ step: 'dataset', dataset: 'berlin' })).toBe('berlin')
  })

  it('describes work from nodes', () => {
    expect(stepDescription({ step: 'work', nodes, records: {} })).toBe('0/2 Knoten')
    expect(stepDescription({ step: 'work', dataset: 'x', remoteCount: 4 })).toBe(
      '4 in der Datenbank',
    )
  })

  it('describes export', () => {
    expect(stepDescription({ step: 'export' })).toBe('Kein Datensatz')
    expect(stepDescription({ step: 'export', dataset: 'x', records: {} })).toBe('0 Bewertungen')
  })
})
