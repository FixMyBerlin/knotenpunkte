import { describe, expect, it } from 'vitest'
import { emptyRapidDraft } from '@/shared/ratings/schema'
import { applySuggestions, rankProbabilities, suggestionMismatch } from './apply'

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

describe('rankProbabilities', () => {
  it('ranks three values high, mid, low', () => {
    expect(rankProbabilities([0.1, 0.7, 0.2])).toEqual(['low', 'high', 'mid'])
  })

  it('ranks two values high and low', () => {
    expect(rankProbabilities([0.14, 0.86])).toEqual(['low', 'high'])
  })

  it('marks a single known value as high and leaves unknown ones unranked', () => {
    expect(rankProbabilities([undefined, 0.72, undefined])).toEqual([undefined, 'high', undefined])
  })

  it('marks equal values as mid, compared by displayed percent', () => {
    expect(rankProbabilities([0.5, 0.5])).toEqual(['mid', 'mid'])
    expect(rankProbabilities([0.4, 0.4, 0.2])).toEqual(['mid', 'mid', 'low'])
    expect(rankProbabilities([0.5, 0.25, 0.25])).toEqual(['high', 'mid', 'mid'])
    expect(rankProbabilities([0.334, 0.333, 0.333])).toEqual(['mid', 'mid', 'mid'])
  })
})
