import { describe, expect, it } from 'vitest'
import { ratingRecordSchema } from './schema'

describe('ratingRecordSchema', () => {
  it('parses a complete rating', () => {
    const parsed = ratingRecordSchema.parse({
      KP_HVS: 1,
      LSA_KP: 0,
      Mar_RVF_KP: 'keine',
      Furt_rot: 'teilweise',
      RFS_Mitte: 'gänzlich',
      Fl_Linksab: 'keine',
      vorgez_Fl: 'keine',
      created_by: 'e2e',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_by: 'e2e',
      updated_at: '2026-01-01T00:00:00.000Z',
      status: 'complete',
    })
    expect(parsed.qa).toBe('none')
    expect(parsed.KP_Nichtbetrachten).toBe(0)
    expect(parsed.history).toEqual([])
  })
})
