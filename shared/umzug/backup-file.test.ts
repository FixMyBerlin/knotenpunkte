import { describe, expect, it } from 'vitest'
import {
  backupFileName,
  backupFileSchema,
  buildBackupFile,
  isBackupKey,
  listBackupKeys,
  type KeyListingStorage,
} from './backup-file'

function fakeStorage(items: Record<string, string>): KeyListingStorage {
  const keys = Object.keys(items)
  return {
    length: keys.length,
    key: (index) => keys[index] ?? null,
    getItem: (key) => items[key] ?? null,
  }
}

const now = new Date('2026-11-05T10:00:00.000Z')

describe('isBackupKey', () => {
  it('takes the keys of Knotenpunkte and Netzanpassungen only', () => {
    expect(isBackupKey('knotenpunkte-background')).toBe(true)
    expect(isBackupKey('na:no-action-suggestions')).toBe(true)
    expect(isBackupKey('__osmAuth')).toBe(false)
    expect(isBackupKey('__osmAuthReturnUrl')).toBe(false)
    expect(isBackupKey('apps:umzug-gesichert')).toBe(false)
    expect(isBackupKey('other')).toBe(false)
  })
})

describe('buildBackupFile', () => {
  const storage = fakeStorage({
    'na:skipped-suggestions': '{}',
    'knotenpunkte-private-rasters': '[{"url":"https://tiles.example/{z}/{x}/{y}?key=SECRET"}]',
    __osmAuth: '{"accessToken":"token"}',
    __osmAuthReturnUrl: '/knotenpunkte/',
    'apps:umzug-gesichert': 'ja',
    'foreign-key': 'x',
  })

  it('writes origin, time and the raw strings of the app keys, sorted', () => {
    const file = buildBackupFile(storage, 'https://fixmyberlin.github.io', now)
    expect(file).toEqual({
      origin: 'https://fixmyberlin.github.io',
      exported_at: '2026-11-05T10:00:00.000Z',
      localStorage: {
        'knotenpunkte-private-rasters': '[{"url":"https://tiles.example/{z}/{x}/{y}?key=SECRET"}]',
        'na:skipped-suggestions': '{}',
      },
    })
    expect(Object.keys(file.localStorage)).toEqual([
      'knotenpunkte-private-rasters',
      'na:skipped-suggestions',
    ])
  })

  it('never includes the OSM login or foreign keys', () => {
    const text = JSON.stringify(buildBackupFile(storage, 'https://example.org', now))
    expect(text).not.toContain('__osmAuth')
    expect(text).not.toContain('token')
    expect(text).not.toContain('foreign-key')
    expect(text).not.toContain('umzug')
  })

  it('is empty without any app key', () => {
    expect(listBackupKeys(fakeStorage({ other: 'x', __osmAuth: 'y' }))).toEqual([])
    expect(buildBackupFile(fakeStorage({}), 'o', now).localStorage).toEqual({})
  })

  it('round-trips through the schema', () => {
    const file = buildBackupFile(storage, 'https://fixmyberlin.github.io', now)
    expect(backupFileSchema.parse(JSON.parse(JSON.stringify(file)))).toEqual(file)
  })
})

describe('backupFileSchema', () => {
  it('drops keys the writer would never write', () => {
    const parsed = backupFileSchema.parse({
      origin: 'x',
      localStorage: { __osmAuth: 'a', 'na:x': 'b', other: 'c' },
    })
    expect(parsed.localStorage).toEqual({ 'na:x': 'b' })
  })

  it('refuses other shapes', () => {
    expect(backupFileSchema.safeParse({ origin: 'x', localStorage: { 'na:x': 5 } }).success).toBe(
      false,
    )
    expect(backupFileSchema.safeParse({ localStorage: {} }).success).toBe(false)
  })

  it('keeps the file name the Netzanpassungen messages mention', () => {
    expect(backupFileName).toBe('knotenpunkte-einstellungen.json')
  })
})
