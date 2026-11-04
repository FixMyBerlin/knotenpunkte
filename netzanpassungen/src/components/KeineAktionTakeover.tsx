import { Button } from '@shared/components/ui/button'
import { Callout } from '@shared/components/ui/callout'
import { useOsmAuth } from '@shared/components/use-osm-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  browserStorage,
  countLocalKeineAktion,
  takeOverLocalKeineAktion,
} from '@/network/keine-aktion'
import { keineAktionQueryRoot, keineAktionStore } from '@/network/keine-aktion-store'
import { networkStore } from '@/network/store'

function markings(count: number) {
  return count === 1 ? '1 Markierung' : `${count} Markierungen`
}

/**
 * The old "Keine Aktion nötig" list lived in this browser's localStorage. Once writing is possible
 * (logged in, or test mode) it moves into the database, one time; before that a note says so.
 */
export function KeineAktionTakeover() {
  const auth = useOsmAuth()
  const queryClient = useQueryClient()
  const waiting = countLocalKeineAktion(browserStorage())
  const canWrite = networkStore.mode === 'lokal' || auth.authenticated
  const takeover = useQuery({
    queryKey: ['na-keine-aktion-takeover'],
    queryFn: async () => {
      const result = await takeOverLocalKeineAktion(keineAktionStore, browserStorage())
      await queryClient.invalidateQueries({ queryKey: keineAktionQueryRoot })
      return result
    },
    enabled: canWrite && waiting > 0,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  if (takeover.isError) {
    return (
      <Callout tone="error" title="Übertragen fehlgeschlagen">
        <p>
          {markings(waiting)} „Keine Aktion nötig“ aus diesem Browser konnten nicht in die Datenbank
          übertragen werden: {takeover.error.message} Sie bleiben hier erhalten.
        </p>
        <Button type="button" color="sky" className="mt-3" onClick={() => void takeover.refetch()}>
          Erneut versuchen
        </Button>
      </Callout>
    )
  }
  if (waiting > 0 && !canWrite && auth.configured) {
    return (
      <Callout tone="info" title="Markierungen aus diesem Browser">
        <p>
          {markings(waiting)} „Keine Aktion nötig“ aus diesem Browser werden nach der Anmeldung in
          die gemeinsame Datenbank übertragen.
        </p>
      </Callout>
    )
  }
  if (takeover.data) {
    const { written, alreadyThere } = takeover.data
    return (
      <Callout tone="info" title="Markierungen übertragen">
        {markings(written + alreadyThere)} „Keine Aktion nötig“ aus diesem Browser stehen jetzt in
        der Datenbank{alreadyThere > 0 ? ` (${alreadyThere} waren schon dort)` : ''}.
      </Callout>
    )
  }
  return null
}
