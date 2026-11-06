import { describe, expect, it } from 'vitest'
import { searchNodeIds } from '@/shared/nodes/search'

const ids = ['40530022', '1405300', '40530', 'KP‐12', '99']

describe('searchNodeIds', () => {
  it('lists the exact match, then prefixes, then the rest', () => {
    expect(searchNodeIds(ids, '40530')).toEqual(['40530', '40530022', '1405300'])
  })

  it('ignores case, spaces and the kind of dash', () => {
    expect(searchNodeIds(ids, ' kp-12 ')).toEqual(['KP‐12'])
  })

  it('matches nothing for an empty query', () => {
    expect(searchNodeIds(ids, '  ')).toEqual([])
  })
})
