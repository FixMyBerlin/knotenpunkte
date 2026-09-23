import { describe, expect, it } from 'vitest'
import { emptyRapidDraft } from '@/shared/ratings/schema'
import { applySuggestions, suggestionMismatch } from './apply'

describe('suggestionMismatch', () => {
  it('is false when values match or either side is empty', () => {
    expect(suggestionMismatch('keine', 'keine')).toBe(false)
    expect(suggestionMismatch(undefined, 'keine')).toBe(false)
    expect(suggestionMismatch('keine', undefined)).toBe(false)
  })

  it('is true when the chosen value differs from the suggestion', () => {
    expect(suggestionMismatch('gänzlich', 'keine')).toBe(true)
    expect(suggestionMismatch(1, 0)).toBe(true)
  })
})

describe('applySuggestions', () => {
  it('prefills empty attributes only', () => {
    const draft = applySuggestions(emptyRapidDraft(), [
      { id: '32580001', attribute: 'Furt_rot', value: 'teilweise', confidence: 0.8 },
    ])
    expect(draft.Furt_rot).toBe('teilweise')
    const kept = applySuggestions({ ...draft, Furt_rot: 'keine' }, [
      { id: '32580001', attribute: 'Furt_rot', value: 'teilweise', confidence: 0.8 },
    ])
    expect(kept.Furt_rot).toBe('keine')
  })
})
