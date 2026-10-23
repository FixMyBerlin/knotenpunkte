import { describe, expect, it } from 'vitest'
import { addToList, removeFromList, splitList } from './list-field'

describe('list field', () => {
  it('splits a `;`-separated value and drops empty parts', () => {
    expect(splitList('1; 2;;3')).toEqual(['1', '2', '3'])
    expect(splitList(undefined)).toEqual([])
  })

  it('adds a value once', () => {
    expect(addToList(undefined, '1')).toBe('1')
    expect(addToList('1', '2')).toBe('1;2')
    expect(addToList('1;2', '2')).toBe('1;2')
  })

  it('removes a value', () => {
    expect(removeFromList('1;2;3', '2')).toBe('1;3')
    expect(removeFromList('1', '1')).toBe('')
  })
})
