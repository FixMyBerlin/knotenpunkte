import { buildBackupFile } from '@shared/umzug/backup-file'
import { describe, expect, it } from 'vitest'
import { applyBackup, parseBackupText, restoreSettings } from './backup'
import {
  localKeineAktionKey,
  type KeineAktionData,
  type KeineAktionSink,
  type StorageLike,
} from './keine-aktion'

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial))
  const storage: StorageLike = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
  return { storage, items }
}

function backupText(local: Record<string, unknown>) {
  return JSON.stringify({
    origin: 'https://fixmyberlin.github.io',
    exported_at: '2026-11-03T10:00:00.000Z',
    localStorage: local,
  })
}

const secret = '[{"name":"Privat","url":"https://tiles.example/{z}/{x}/{y}?key=SECRET-KEY"}]'

function fakeSink(fail = false) {
  const written: KeineAktionData[] = []
  const sink: KeineAktionSink = {
    existing: async () => new Set(),
    putBatch: async (items) => {
      if (fail) throw new Error('Netzwerkfehler')
      written.push(...items)
    },
  }
  return { sink, written }
}

describe('parseBackupText', () => {
  it('reads a complete backup', () => {
    const backup = parseBackupText(
      backupText({
        'na:no-action-suggestions': '{"berlin":["a@1"]}',
        'na:skipped-suggestions': '{}',
        'knotenpunkte-private-rasters': secret,
        'knotenpunkte-background': '"osm"',
        'knotenpunkte-background-favorites': '[]',
        'knotenpunkte-sidebar-width': '{"state":{"width":320},"version":0}',
      }),
    )
    expect(backup.origin).toBe('https://fixmyberlin.github.io')
    expect(Object.keys(backup.localStorage)).toHaveLength(6)
  })

  it('accepts missing keys and ignores unknown ones', () => {
    const backup = parseBackupText(backupText({ 'other-app-key': 'x' }))
    expect(backup.localStorage).toEqual({})
  })

  it('rejects other shapes with a German message', () => {
    expect(() => parseBackupText('{"hello":"world"}')).toThrow(/keine Sicherung/)
    expect(() => parseBackupText('[]')).toThrow(/keine Sicherung/)
    expect(() => parseBackupText(backupText({ 'na:skipped-suggestions': 5 }))).toThrow(
      /keine Sicherung/,
    )
    expect(() =>
      parseBackupText(JSON.stringify({ origin: 'x', localStorage: 'not an object' })),
    ).toThrow(/keine Sicherung/)
  })

  it('rejects garbage', () => {
    expect(() => parseBackupText('{not json')).toThrow(/kein JSON/)
    expect(() => parseBackupText('')).toThrow(/kein JSON/)
  })
})

describe('buildBackupFile and parseBackupText', () => {
  it('reads what the writer on the old origin produces', () => {
    const stored: Record<string, string> = {
      'na:no-action-suggestions': '{"berlin":["a@1"]}',
      'na:skipped-suggestions': '{}',
      'knotenpunkte-private-rasters': secret,
      'knotenpunkte-background': '"osm"',
      'knotenpunkte-background-favorites': '[]',
      'knotenpunkte-sidebar-width': '{"state":{"width":320},"version":0}',
      __osmAuth: '{"accessToken":"token"}',
      other: 'x',
    }
    const keys = Object.keys(stored)
    const file = buildBackupFile(
      {
        length: keys.length,
        key: (index) => keys[index] ?? null,
        getItem: (key) => stored[key] ?? null,
      },
      'https://fixmyberlin.github.io',
      new Date('2026-11-05T10:00:00.000Z'),
    )
    const backup = parseBackupText(JSON.stringify(file))
    expect(backup.origin).toBe('https://fixmyberlin.github.io')
    expect(backup.exported_at).toBe('2026-11-05T10:00:00.000Z')
    expect(backup.localStorage).toEqual({
      'na:no-action-suggestions': '{"berlin":["a@1"]}',
      'na:skipped-suggestions': '{}',
      'knotenpunkte-private-rasters': secret,
      'knotenpunkte-background': '"osm"',
      'knotenpunkte-background-favorites': '[]',
      'knotenpunkte-sidebar-width': '{"state":{"width":320},"version":0}',
    })
  })

  it('lets the app restore the settings from the written file', () => {
    const stored: Record<string, string> = { 'knotenpunkte-background': '"osm"' }
    const file = buildBackupFile(
      { length: 1, key: () => 'knotenpunkte-background', getItem: (key) => stored[key] ?? null },
      'https://fixmyberlin.github.io',
    )
    const { storage, items } = fakeStorage()
    const result = restoreSettings(parseBackupText(JSON.stringify(file)), storage)
    expect(result.map((item) => item.status)).toEqual(['eingespielt'])
    expect(items.get('knotenpunkte-background')).toBe('"osm"')
  })
})

describe('restoreSettings', () => {
  it('writes missing keys, keeps existing ones, rejects unreadable ones', () => {
    const { storage, items } = fakeStorage({ 'knotenpunkte-background': '"mine"' })
    const backup = parseBackupText(
      backupText({
        'na:skipped-suggestions': '{"berlin":["a@1"]}',
        'knotenpunkte-private-rasters': secret,
        'knotenpunkte-background': '"osm"',
        'knotenpunkte-background-favorites': 'not json',
      }),
    )
    const result = restoreSettings(backup, storage)
    expect(result.map((item) => [item.key, item.status])).toEqual([
      ['na:skipped-suggestions', 'eingespielt'],
      ['knotenpunkte-private-rasters', 'eingespielt'],
      ['knotenpunkte-background', 'schon vorhanden'],
      ['knotenpunkte-background-favorites', 'nicht lesbar'],
    ])
    expect(items.get('knotenpunkte-background')).toBe('"mine"')
    expect(items.get('knotenpunkte-private-rasters')).toBe(secret)
    expect(items.has('knotenpunkte-background-favorites')).toBe(false)
  })

  it('never puts values into the report', () => {
    const { storage } = fakeStorage()
    const backup = parseBackupText(backupText({ 'knotenpunkte-private-rasters': secret }))
    expect(JSON.stringify(restoreSettings(backup, storage))).not.toContain('SECRET-KEY')
  })

  it('reports a blocked storage', () => {
    const blocked: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
      removeItem: () => undefined,
    }
    const backup = parseBackupText(backupText({ 'knotenpunkte-background': '"osm"' }))
    expect(restoreSettings(backup, blocked)[0]?.status).toBe('nicht möglich')
  })
})

describe('applyBackup', () => {
  const text = backupText({ [localKeineAktionKey]: '{"berlin":["a@1","b@1"]}' })

  it('transfers the markings and clears the local key', async () => {
    const { storage, items } = fakeStorage()
    const { sink, written } = fakeSink()
    const report = await applyBackup(parseBackupText(text), storage, sink)
    expect(written).toHaveLength(2)
    expect(report.keineAktion?.transferred?.written).toBe(2)
    expect(items.has(localKeineAktionKey)).toBe(false)
  })

  it('keeps the markings local without a sink (not logged in)', async () => {
    const { storage, items } = fakeStorage({ [localKeineAktionKey]: '{"berlin":["c@1"]}' })
    const report = await applyBackup(parseBackupText(text), storage, null)
    expect(report.keineAktion).toEqual({ count: 2, transferred: null, error: null })
    expect(JSON.parse(items.get(localKeineAktionKey)!)).toEqual({
      berlin: ['c@1', 'a@1', 'b@1'],
    })
  })

  it('keeps the markings local and reports when the transfer fails', async () => {
    const { storage, items } = fakeStorage()
    const report = await applyBackup(parseBackupText(text), storage, fakeSink(true).sink)
    expect(report.keineAktion?.error).toBe('Netzwerkfehler')
    expect(items.has(localKeineAktionKey)).toBe(true)
  })

  it('reports unreadable markings and still restores the rest', async () => {
    const { storage, items } = fakeStorage()
    const report = await applyBackup(
      parseBackupText(
        backupText({ [localKeineAktionKey]: '[1]', 'knotenpunkte-background': '"osm"' }),
      ),
      storage,
      fakeSink().sink,
    )
    expect(report.keineAktionUnreadable).toBe(true)
    expect(report.settings).toHaveLength(1)
    expect(items.get('knotenpunkte-background')).toBe('"osm"')
  })

  it('has nothing to do for an empty backup', async () => {
    const report = await applyBackup(parseBackupText(backupText({})), fakeStorage().storage, null)
    expect(report).toEqual({ keineAktion: null, keineAktionUnreadable: false, settings: [] })
  })
})
