import { describe, expect, it } from 'vitest'
import { approachLinesAt } from '@/shared/mapillary/approaches'

const node: [number, number] = [13.4, 52.5]
const north: [number, number] = [13.4, 52.501]
const south: [number, number] = [13.4, 52.499]
const east: [number, number] = [13.4015, 52.5]

describe('approachLinesAt', () => {
  it('turns lines that end at the node so they start there', () => {
    const lines = approachLinesAt(node, [
      [north, node],
      [node, east],
    ])
    expect(lines).toEqual([
      [node, north],
      [node, east],
    ])
  })

  it('splits a line that passes through the node', () => {
    const lines = approachLinesAt(node, [[north, node, south]])
    expect(lines).toEqual([
      [node, north],
      [node, south],
    ])
  })

  it('counts a street once when two tiles deliver it', () => {
    const halfway: [number, number] = [13.4, 52.5005]
    const lines = approachLinesAt(node, [
      [node, halfway],
      [node, halfway, north],
    ])
    expect(lines).toEqual([[node, halfway, north]])
  })

  it('ignores streets that do not touch the node', () => {
    expect(approachLinesAt(node, [[north, [13.401, 52.501]]])).toEqual([])
  })
})
