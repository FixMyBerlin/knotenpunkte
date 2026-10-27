import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { useOsmAuth } from '@shared/components/use-osm-auth'
import { networkStore } from '@/network/store'

/**
 * Test mode: without a KV project key nothing goes to the shared database. With one, saving needs
 * an OSM login.
 */
export function StorageModeCallout() {
  const auth = useOsmAuth()
  if (networkStore.mode === 'kv') {
    if (auth.authenticated || !auth.configured) return null
    return (
      <Callout tone="warning" title="Nicht angemeldet">
        <p>Ohne OSM-Login lässt sich nichts speichern, ändern oder löschen.</p>
        <Button type="button" color="sky" className="mt-3" onClick={auth.login}>
          Anmelden
        </Button>
      </Callout>
    )
  }
  return (
    <Callout tone="warning" title="Testmodus">
      Das KV-Projekt <code>netzanpassungen</code> ist noch nicht eingerichtet. Gezeichnetes wird nur
      in diesem Browser gespeichert.
    </Callout>
  )
}
