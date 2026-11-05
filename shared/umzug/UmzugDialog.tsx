import { Button } from '@shared/components/ui/button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from '@shared/components/ui/dialog'
import type { ReactNode } from 'react'
import { BackupSection } from './BackupSection'
import { type UmzugView } from './umzug-state'
import { useUmzug } from './use-umzug'

type UmzugDialogProps = {
  umzug: ReturnType<typeof useUmzug>
  /** The transfer of the pending markings (Netzanpassungen only); shown when `view.transfer`. */
  transfer?: ReactNode
}

function title(view: UmzugView) {
  return view.backup ? 'Die Apps ziehen um' : 'Markierungen übertragen'
}

/**
 * The move dialog: the transfer of the "Keine Aktion nötig" markings into the database (given as
 * `transfer`) and, on the old Pages origin, the download of the settings.
 */
export function UmzugDialog({ umzug, transfer }: UmzugDialogProps) {
  const { view, open, close, markDone } = umzug
  if (!view.open) return null

  return (
    <Dialog open={open} onClose={close} size="xl" data-testid="umzug-dialog">
      <DialogTitle>{title(view)}</DialogTitle>
      <DialogDescription>
        {view.transfer && view.backup
          ? 'Zwei Dinge sind zu tun, bevor die alte Adresse abgeschaltet wird.'
          : view.backup
            ? 'Sichere deine Einstellungen, bevor die alte Adresse abgeschaltet wird.'
            : 'Die Markierungen „Keine Aktion nötig“ liegen bisher nur in diesem Browser.'}
      </DialogDescription>
      <DialogBody className="space-y-6">
        {view.transfer ? transfer : null}
        {view.backup ? <BackupSection /> : null}
      </DialogBody>
      <DialogActions>
        <Button type="button" plain onClick={close} data-testid="umzug-later">
          {view.backup ? 'Später erinnern' : 'Schließen'}
        </Button>
        {view.backup ? (
          <Button type="button" outline onClick={markDone} data-testid="umzug-done">
            Erledigt
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
