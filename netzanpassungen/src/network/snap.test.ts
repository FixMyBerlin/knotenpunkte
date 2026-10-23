import { describe, expect, it } from 'vitest'
import { snap } from './snap'
import { A, testNetwork } from './test-network'

describe('snap', () => {
  it('prefers a node within its tolerance over the edges there', () => {
    const target = snap(testNetwork(), [A[0] + 0.00005, A[1]], 5, 5)
    expect(target?.type).toBe('node')
    expect(target?.type === 'node' && target.node.name).toBe('44530016')
  })

  it('takes the REN+ edge where it lies on a Detailnetz edge', () => {
    const target = snap(testNetwork(), [13.4006, 52.50002], 1, 5)
    expect(target?.type).toBe('edge')
    if (target?.type !== 'edge') return
    expect(target.edge.kind).toBe('ren')
    expect(target.stationM).toBeCloseTo(40.7, 0)
    expect(target.lngLat[1]).toBeCloseTo(52.5, 7)
  })

  it('finds nothing outside the tolerance', () => {
    expect(snap(testNetwork(), [13.4006, 52.5005], 5, 5)).toBeNull()
  })
})
