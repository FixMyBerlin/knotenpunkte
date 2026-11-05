import { describe, expect, it } from 'vitest'
import {
  readBackupDone,
  umzugDoneKey,
  umzugView,
  writeBackupDone,
  type UmzugInput,
} from './umzug-state'

const base: UmzugInput = {
  pagesTarget: true,
  pendingCount: 0,
  hasBackupData: true,
  backupDone: false,
}

describe('umzugView', () => {
  it('on Pages with settings to save: backup only', () => {
    expect(umzugView(base)).toEqual({ transfer: false, backup: true, open: true })
  })

  it('on Pages with pending markings: both sections', () => {
    expect(umzugView({ ...base, pendingCount: 3 })).toEqual({
      transfer: true,
      backup: true,
      open: true,
    })
  })

  it('on Netlify the backup never shows', () => {
    expect(umzugView({ ...base, pagesTarget: false })).toEqual({
      transfer: false,
      backup: false,
      open: false,
    })
  })

  it('on Netlify pending markings still show the transfer', () => {
    expect(umzugView({ ...base, pagesTarget: false, pendingCount: 1 })).toEqual({
      transfer: true,
      backup: false,
      open: true,
    })
  })

  it('without anything to save there is no backup section', () => {
    expect(umzugView({ ...base, hasBackupData: false }).open).toBe(false)
  })

  it('"Erledigt" hides the backup but not pending markings', () => {
    expect(umzugView({ ...base, backupDone: true }).open).toBe(false)
    expect(umzugView({ ...base, backupDone: true, pendingCount: 2 })).toEqual({
      transfer: true,
      backup: false,
      open: true,
    })
  })
})

describe('backup done flag', () => {
  it('is remembered in the storage under its own key', () => {
    const items = new Map<string, string>()
    const storage = {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => void items.set(key, value),
    }
    expect(readBackupDone(storage)).toBe(false)
    writeBackupDone(storage)
    expect(items.get(umzugDoneKey)).toBe('ja')
    expect(readBackupDone(storage)).toBe(true)
  })

  it('survives a blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readBackupDone(blocked)).toBe(false)
    expect(() => writeBackupDone(blocked)).not.toThrow()
    expect(readBackupDone(null)).toBe(false)
  })
})
