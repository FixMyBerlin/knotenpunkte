import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { markings } from '@/components/markings'
import { useKeineAktionTakeover } from '@/components/use-keine-aktion-takeover'

/**
 * Sidebar note about the old "Keine Aktion nötig" list of this browser, for when the move dialog
 * is closed. The transfer itself runs in `useKeineAktionTakeover`; the dialog shows the details.
 */
export function KeineAktionTakeover() {
  const { status, retry } = useKeineAktionTakeover()

  if (status.kind === 'error') {
    return (
      <Callout tone="error" title="Übertragen fehlgeschlagen">
        <p>
          {markings(status.waiting)} „Keine Aktion nötig“ aus diesem Browser konnten nicht in die
          Datenbank übertragen werden: {status.message} Sie bleiben hier erhalten.
        </p>
        <Button type="button" color="sky" className="mt-3" onClick={retry}>
          Erneut versuchen
        </Button>
      </Callout>
    )
  }
  if (status.kind === 'needs-login' && status.loginConfigured) {
    return (
      <Callout tone="info" title="Markierungen aus diesem Browser">
        <p>
          {markings(status.waiting)} „Keine Aktion nötig“ aus diesem Browser werden nach der
          Anmeldung in die gemeinsame Datenbank übertragen.
        </p>
      </Callout>
    )
  }
  if (status.kind === 'done') {
    const { written, alreadyThere } = status.result
    return (
      <Callout tone="info" title="Markierungen übertragen">
        {markings(written + alreadyThere)} „Keine Aktion nötig“ aus diesem Browser stehen jetzt in
        der Datenbank{alreadyThere > 0 ? ` (${alreadyThere} waren schon dort)` : ''}.
      </Callout>
    )
  }
  return null
}
