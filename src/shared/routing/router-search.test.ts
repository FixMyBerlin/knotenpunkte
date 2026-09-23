import { describe, expect, it } from 'vitest'
import { routerSearch } from './router-search'
import { dataSearchSchema, indexSearchSchema } from './search-schema'

function roundTrip(search: Record<string, unknown>) {
  return indexSearchSchema.parse(routerSearch.parse(routerSearch.stringify(search)))
}

describe('routerSearch', () => {
  it('keeps the map param readable instead of percent-encoding the slashes', () => {
    expect(routerSearch.stringify({ map: '14.6/52.5076/13.3115' })).toBe(
      '?map=14.6/52.5076/13.3115',
    )
  })

  it('round-trips an all-digit node id as a string', () => {
    expect(roundTrip({ node: '32580001' }).node).toBe('32580001')
  })

  it('round-trips an all-digit dataset slug as a string', () => {
    expect(roundTrip({ dataset: '2026' }).dataset).toBe('2026')
  })

  it('round-trips view, status, and bg', () => {
    const search = roundTrip({ view: 'overview', status: 'confirmed', bg: 'osm-mapnik' })
    expect(search.view).toBe('overview')
    expect(search.status).toBe('confirmed')
    expect(search.bg).toBe('osm-mapnik')
  })

  it('drops empty bg and unknown status', () => {
    expect(roundTrip({ bg: '' }).bg).toBeUndefined()
    expect(roundTrip({ status: 'nope' }).status).toBeUndefined()
  })
})

describe('dataSearchSchema', () => {
  it('round-trips dataset, node, and q', () => {
    const search = dataSearchSchema.parse(
      routerSearch.parse(routerSearch.stringify({ dataset: '2026', node: '32580001', q: 'note' })),
    )
    expect(search).toEqual({ dataset: '2026', node: '32580001', q: 'note' })
  })
})
