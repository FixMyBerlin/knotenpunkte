import { z } from 'zod'

/** Name of the settings file, written by the apps on the old origin and read by Netzanpassungen. */
export const backupFileName = 'knotenpunkte-einstellungen.json'

/** localStorage keys of the apps: Knotenpunkte (and the shared map code) and Netzanpassungen. */
const backupKeyPrefixes = ['knotenpunkte-', 'na:']

/**
 * Whether a localStorage key belongs in the backup. Writer and reader use this one rule, so they
 * cannot drift. Never the OSM login (`__osmAuth*`): it does not start with a prefix.
 */
export function isBackupKey(key: string) {
  return backupKeyPrefixes.some((prefix) => key.startsWith(prefix))
}

/**
 * The file: the raw localStorage strings by key. Unknown keys are dropped on reading. Every setting
 * the app wants back is looked up by its key afterwards, so any key may be missing.
 */
export const backupFileSchema = z.object({
  origin: z.string(),
  exported_at: z.string().optional(),
  localStorage: z
    .record(z.string(), z.string())
    .transform((items): Partial<Record<string, string>> => {
      return Object.fromEntries(Object.entries(items).filter(([key]) => isBackupKey(key)))
    }),
})

export type BackupFile = z.infer<typeof backupFileSchema>

/** What `localStorage` offers for listing keys. */
export type KeyListingStorage = Pick<Storage, 'getItem' | 'key' | 'length'>

/** Keys of the apps in a storage, sorted. */
export function listBackupKeys(storage: KeyListingStorage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key !== null && isBackupKey(key)) keys.push(key)
  }
  return keys.toSorted()
}

/** All settings of the apps as the file holds them. Contains private background URLs with keys. */
export function buildBackupFile(
  storage: KeyListingStorage,
  origin: string,
  now: Date = new Date(),
): z.input<typeof backupFileSchema> {
  const items: Record<string, string> = {}
  for (const key of listBackupKeys(storage)) {
    const value = storage.getItem(key)
    if (value !== null) items[key] = value
  }
  return { origin, exported_at: now.toISOString(), localStorage: items }
}
