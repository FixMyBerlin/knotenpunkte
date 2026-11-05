import { isPagesDeploy } from '@shared/config/deploy-target'
import { listBackupKeys, type KeyListingStorage } from './backup-file'

/** Set to `ja` once the user says the settings are saved ("Erledigt"). Shared by the apps of an origin. */
export const umzugDoneKey = 'apps:umzug-gesichert'

export type UmzugInput = {
  /** The build runs on the old GitHub Pages origin. */
  pagesTarget: boolean
  /** "Keine Aktion nötig" markings in this browser that still wait for the database. */
  pendingCount: number
  /** This browser has settings of the apps that a file can hold. */
  hasBackupData: boolean
  /** The user marked the backup as done. */
  backupDone: boolean
}

export type UmzugView = {
  /** Show the transfer of the pending markings. */
  transfer: boolean
  /** Show the section to download the settings. */
  backup: boolean
  /** Show the dialog at all. */
  open: boolean
}

/**
 * What the move dialog shows at start. The transfer shows while markings are pending, on every
 * origin. The backup only on the old Pages origin, while there is something to save and it was not
 * marked as done.
 */
export function umzugView(input: UmzugInput): UmzugView {
  const transfer = input.pendingCount > 0
  const backup = input.pagesTarget && input.hasBackupData && !input.backupDone
  return { transfer, backup, open: transfer || backup }
}

type DoneStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): (DoneStorage & KeyListingStorage) | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

export function readBackupDone(storage: Pick<Storage, 'getItem'> | null = browserStorage()) {
  try {
    return storage?.getItem(umzugDoneKey) === 'ja'
  } catch {
    return false
  }
}

export function writeBackupDone(storage: DoneStorage | null = browserStorage()) {
  try {
    storage?.setItem(umzugDoneKey, 'ja')
  } catch {
    // The dialog shows again at the next start then.
  }
}

/** The state of this browser, read once when the app starts. */
export function readUmzugInput(pendingCount: number): UmzugInput {
  const storage = browserStorage()
  let hasBackupData = false
  try {
    hasBackupData = storage !== null && listBackupKeys(storage).length > 0
  } catch {
    hasBackupData = false
  }
  return {
    pagesTarget: isPagesDeploy,
    pendingCount,
    hasBackupData,
    backupDone: readBackupDone(storage),
  }
}
