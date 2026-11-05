import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { Text } from '@shared/components/ui/text'
import { markings } from '@/components/markings'
import { useTakeoverProgress } from '@/components/takeover-progress-store'
import { useKeineAktionTakeover } from '@/components/use-keine-aktion-takeover'

/**
 * The transfer part of the move dialog: the "Keine Aktion nötig" markings of this browser go into
 * the shared database after the login. Local data stays until every batch succeeded.
 */
export function KeineAktionTransfer() {
  const { status, retry, login } = useKeineAktionTakeover()
  const progress = useTakeoverProgress()

  return (
    <section className="space-y-3" data-testid="umzug-transfer">
      <h3 className="text-sm/6 font-semibold text-white">Markierungen „Keine Aktion nötig“</h3>
      {status.kind === 'needs-login' ? (
        <>
          <Text>
            {markings(status.waiting)} „Keine Aktion nötig“ liegen nur in diesem Browser. Melde dich
            an, dann übertragen wir sie in die gemeinsame Datenbank.
          </Text>
          {status.loginConfigured ? (
            <Button type="button" color="sky" onClick={login} data-testid="umzug-login">
              Mit OSM anmelden
            </Button>
          ) : (
            <Callout tone="warning">OSM-Login ist nicht konfiguriert.</Callout>
          )}
        </>
      ) : null}
      {status.kind === 'checking' ? <Text>Prüfe die Anmeldung …</Text> : null}
      {status.kind === 'transferring' ? (
        <Text role="status" data-testid="umzug-progress">
          {progress && progress.total > 0
            ? `Übertrage … ${progress.done} von ${progress.total}`
            : `Übertrage ${markings(status.waiting)} …`}
        </Text>
      ) : null}
      {status.kind === 'done' ? (
        <Callout tone="info" title="Übertragen" data-testid="umzug-success">
          {markings(status.result.written)} übertragen
          {status.result.alreadyThere > 0 ? ` (${status.result.alreadyThere} waren schon da)` : ''}.
          Sie sind jetzt für alle sichtbar.
          {status.result.ignored > 0
            ? ` ${markings(status.result.ignored)} ließen sich nicht speichern.`
            : ''}
        </Callout>
      ) : null}
      {status.kind === 'error' ? (
        <>
          <Callout tone="error" title="Übertragen fehlgeschlagen" data-testid="umzug-error">
            {status.message} Die Markierungen bleiben in diesem Browser erhalten.
          </Callout>
          <Button type="button" color="sky" onClick={retry} data-testid="umzug-retry">
            Erneut versuchen
          </Button>
        </>
      ) : null}
    </section>
  )
}
