import { z } from 'zod'
import {
  countIds,
  localKeineAktionKey,
  mergeIdRecords,
  parseIdRecord,
  readLocalKeineAktion,
  takeOverLocalKeineAktion,
  type KeineAktionSink,
  type StorageLike,
  type TransferResult,
} from './keine-aktion'

export const skippedKey = 'na:skipped-suggestions'

/** What the backup script of the old origin writes: the raw localStorage strings, any key may be missing. */
const backupSchema = z.object({
  origin: z.string(),
  exported_at: z.string().optional(),
  localStorage: z.object({
    [localKeineAktionKey]: z.string().optional(),
    [skippedKey]: z.string().optional(),
    'knotenpunkte-private-rasters': z.string().optional(),
    'knotenpunkte-background': z.string().optional(),
    'knotenpunkte-background-favorites': z.string().optional(),
    'knotenpunkte-sidebar-width': z.string().optional(),
  }),
})

export type Backup = z.infer<typeof backupSchema>

/** Settings written back to localStorage as they are, when not set yet. Never sent anywhere. */
const restorableKeys = [
  { key: skippedKey, label: 'Übersprungene Vorschläge' },
  { key: 'knotenpunkte-private-rasters', label: 'Private Hintergrundkarten' },
  { key: 'knotenpunkte-background', label: 'Gewählte Hintergrundkarte' },
  { key: 'knotenpunkte-background-favorites', label: 'Favoriten der Hintergrundkarten' },
  { key: 'knotenpunkte-sidebar-width', label: 'Breite der Seitenleiste' },
] as const

const notABackupMessage =
  'Das ist keine Sicherung. Erwartet wird die Datei „knotenpunkte-einstellungen.json“ aus dem Sicherungs-Skript.'

/** Throws an `Error` with a German message when the text is not a backup file. */
export function parseBackupText(text: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein JSON. Erwartet wird „knotenpunkte-einstellungen.json“.')
  }
  const parsed = backupSchema.safeParse(json)
  if (!parsed.success) throw new Error(notABackupMessage)
  return parsed.data
}

function isJson(text: string) {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

type RestoreStatus = 'eingespielt' | 'schon vorhanden' | 'nicht lesbar' | 'nicht möglich'

export type RestoreItem = { key: string; label: string; status: RestoreStatus }

/** Writes a setting back only when the key is not set yet. Reports labels and states, never values. */
export function restoreSettings(backup: Backup, storage: StorageLike): RestoreItem[] {
  const items: RestoreItem[] = []
  for (const { key, label } of restorableKeys) {
    const value = backup.localStorage[key]
    if (value === undefined) continue
    const valid = key === skippedKey ? parseIdRecord(value) !== null : isJson(value)
    if (!valid) {
      items.push({ key, label, status: 'nicht lesbar' })
      continue
    }
    try {
      if (storage.getItem(key) !== null) {
        items.push({ key, label, status: 'schon vorhanden' })
        continue
      }
      storage.setItem(key, value)
      items.push({ key, label, status: 'eingespielt' })
    } catch {
      items.push({ key, label, status: 'nicht möglich' })
    }
  }
  return items
}

export type BackupReport = {
  /** The "Keine Aktion nötig" markings in the file; null when it has none or they are unreadable. */
  keineAktion: {
    count: number
    /** Null when they wait for the login, or the transfer failed. */
    transferred: TransferResult | null
    error: string | null
  } | null
  /** The file has the key, but its value has the wrong shape. */
  keineAktionUnreadable: boolean
  settings: RestoreItem[]
}

/**
 * Applies a backup. The "Keine Aktion nötig" markings are merged into the local list and go to the
 * database at once when `sink` is given (logged in, or test mode); otherwise they stay local and
 * the start-up takeover moves them after the login.
 */
export async function applyBackup(
  backup: Backup,
  storage: StorageLike,
  sink: KeineAktionSink | null,
): Promise<BackupReport> {
  const settings = restoreSettings(backup, storage)
  const text = backup.localStorage[localKeineAktionKey]
  const incoming = parseIdRecord(text)
  if (text !== undefined && incoming === null) {
    return { keineAktion: null, keineAktionUnreadable: true, settings }
  }
  const count = countIds(incoming)
  if (!incoming || count === 0) return { keineAktion: null, keineAktionUnreadable: false, settings }

  storage.setItem(
    localKeineAktionKey,
    JSON.stringify(mergeIdRecords(readLocalKeineAktion(storage), incoming)),
  )
  if (!sink) {
    return {
      keineAktion: { count, transferred: null, error: null },
      keineAktionUnreadable: false,
      settings,
    }
  }
  try {
    const transferred = await takeOverLocalKeineAktion(sink, storage)
    return {
      keineAktion: { count, transferred, error: null },
      keineAktionUnreadable: false,
      settings,
    }
  } catch (error) {
    return {
      keineAktion: {
        count,
        transferred: null,
        error: error instanceof Error ? error.message : 'Übertragen fehlgeschlagen',
      },
      keineAktionUnreadable: false,
      settings,
    }
  }
}
