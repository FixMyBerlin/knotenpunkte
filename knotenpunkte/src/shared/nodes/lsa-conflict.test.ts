import { describe, expect, it } from 'vitest'
import { lsaConflict } from './schema'

describe('lsaConflict', () => {
  it('returns the conflict source', () => {
    expect(lsaConflict({ LSA_Konflikt: 'nur_OSM' })).toBe('nur_OSM')
    expect(lsaConflict({ LSA_Konflikt: 'nur_OpenData' })).toBe('nur_OpenData')
  })

  it('is undefined without a conflict', () => {
    expect(lsaConflict({})).toBeUndefined()
    expect(lsaConflict({ LSA_Konflikt: null })).toBeUndefined()
    expect(lsaConflict({ LSA_Konflikt: '' })).toBeUndefined()
  })
})
