import { useState } from 'react'
import { readUmzugInput, umzugView, writeBackupDone } from './umzug-state'

/**
 * Open state of the move dialog. What it shows is decided once, when the app starts, so the dialog
 * does not vanish while it works (a finished transfer empties the pending list). Closing keeps
 * everything as it is, so the dialog comes back at the next start; "Erledigt" is remembered.
 */
export function useUmzug(pendingCount: number) {
  const [view] = useState(() => umzugView(readUmzugInput(pendingCount)))
  const [open, setOpen] = useState(view.open)
  return {
    view,
    open,
    close: () => setOpen(false),
    reopen: () => setOpen(true),
    markDone: () => {
      writeBackupDone()
      setOpen(false)
    },
  }
}
