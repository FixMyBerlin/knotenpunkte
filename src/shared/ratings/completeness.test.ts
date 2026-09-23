import { describe, expect, it } from 'vitest'
import {
  firstEmptyRapidKey,
  hasAllRapidAttributes,
  isRatingComplete,
  isSkipped,
} from './completeness'
import { emptyRapidDraft } from './schema'

describe('completeness', () => {
  it('is incomplete until all seven attributes are set', () => {
    const draft = emptyRapidDraft()
    expect(isRatingComplete(draft)).toBe(false)
    expect(firstEmptyRapidKey(draft)).toBe('KP_HVS')
    const filled = {
      ...draft,
      KP_HVS: 1 as const,
      LSA_KP: 0 as const,
      Mar_RVF_KP: 'keine' as const,
      Furt_rot: 'teilweise' as const,
      RFS_Mitte: 'gänzlich' as const,
      Fl_Linksab: 'keine' as const,
    }
    expect(hasAllRapidAttributes(filled)).toBe(false)
    expect(isRatingComplete({ ...filled, vorgez_Fl: 'keine' })).toBe(true)
  })

  it('counts skip as complete even when the seven attributes are empty', () => {
    const skipped = { ...emptyRapidDraft(), KP_Nichtbetrachten: 1 as const }
    expect(isSkipped(skipped)).toBe(true)
    expect(isRatingComplete(skipped)).toBe(true)
  })
})
