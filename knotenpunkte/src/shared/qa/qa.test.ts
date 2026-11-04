import { describe, expect, it } from 'vitest'
import { canRunQa } from './qa'

describe('canRunQa', () => {
  it('blocks the original rater', () => {
    expect(canRunQa({ displayName: 'alice', createdBy: 'alice' })).toBe(false)
  })

  it('allows a different logged-in user', () => {
    expect(canRunQa({ displayName: 'bob', createdBy: 'alice' })).toBe(true)
  })

  it('allows an admin to QA their own rating', () => {
    expect(canRunQa({ displayName: 'tordans', createdBy: 'tordans' })).toBe(true)
    expect(canRunQa({ displayName: 'Supaplex030', createdBy: 'Supaplex030' })).toBe(true)
  })

  it('rejects missing names', () => {
    expect(canRunQa({ displayName: undefined, createdBy: 'alice' })).toBe(false)
    expect(canRunQa({ displayName: 'alice', createdBy: undefined })).toBe(false)
  })
})
