import { describe, expect, it } from 'vitest'
import { suggestedBetrachtung, type SuggestionRow } from './schema'

const row = (
  attribute: 'KP_HVS' | 'LSA_KP' | 'Furt_rot',
  value: 0 | 1 | 'keine',
): SuggestionRow => ({
  id: '1',
  attribute,
  value,
  confidence: 0.9,
})

describe('suggestedBetrachtung', () => {
  it('is 0 when HVS and LSA are both suggested as 0', () => {
    expect(suggestedBetrachtung([row('KP_HVS', 0), row('LSA_KP', 0)])).toBe(0)
  })

  it('is 1 when HVS or LSA is suggested as 1', () => {
    expect(suggestedBetrachtung([row('KP_HVS', 1), row('LSA_KP', 0)])).toBe(1)
    expect(suggestedBetrachtung([row('KP_HVS', 0), row('LSA_KP', 1)])).toBe(1)
  })

  it('stays 1 when a suggestion is missing', () => {
    expect(suggestedBetrachtung([row('KP_HVS', 0)])).toBe(1)
    expect(suggestedBetrachtung([row('Furt_rot', 'keine')])).toBe(1)
    expect(suggestedBetrachtung([])).toBe(1)
  })
})
