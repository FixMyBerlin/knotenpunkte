import { Callout } from '@shared/components/ui/callout'
import { networkStore } from '@/network/store'

/** Test mode: without a KV project key nothing goes to the shared database. */
export function StorageModeCallout() {
  if (networkStore.mode === 'kv') return null
  return (
    <Callout tone="warning" title="Testmodus">
      Das KV-Projekt <code>netzanpassungen</code> ist noch nicht eingerichtet. Gezeichnetes wird nur
      in diesem Browser gespeichert.
    </Callout>
  )
}
