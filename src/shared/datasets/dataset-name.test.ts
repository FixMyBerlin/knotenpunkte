import { describe, expect, it } from 'vitest'
import { isValidDatasetName, slugifyDatasetName } from './dataset-name'

describe('isValidDatasetName', () => {
  it('accepts stable slugs', () => {
    expect(isValidDatasetName('berlin')).toBe(true)
    expect(isValidDatasetName('berlin-sample')).toBe(true)
  })

  it('rejects dates, uppercase, and short names', () => {
    expect(isValidDatasetName('ab')).toBe(false)
    expect(isValidDatasetName('Berlin')).toBe(false)
    expect(isValidDatasetName('berlin_sample')).toBe(false)
  })
})

describe('slugifyDatasetName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyDatasetName('Berlin Sample')).toBe('berlin-sample')
  })
})
