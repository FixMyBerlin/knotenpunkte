import { describe, expect, it } from 'vitest'
import { adminOsmDisplayNames, isAdmin } from './admins.const'

describe('isAdmin', () => {
  it('matches every configured display name exactly', () => {
    for (const name of adminOsmDisplayNames) {
      expect(isAdmin(name)).toBe(true)
    }
  })

  it('rejects case-different or partial matches', () => {
    expect(isAdmin('Tordans')).toBe(false)
    expect(isAdmin('tordans2')).toBe(false)
    expect(isAdmin(' tordans')).toBe(false)
  })

  it('rejects unknown, empty, and missing names', () => {
    expect(isAdmin('someone-else')).toBe(false)
    expect(isAdmin('')).toBe(false)
    expect(isAdmin(undefined)).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})
