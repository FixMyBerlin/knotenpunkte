import { useOsmAuth } from '@shared/components/use-osm-auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  browserStorage,
  countLocalKeineAktion,
  takeOverLocalKeineAktion,
  type TransferResult,
} from '@/network/keine-aktion'
import { keineAktionQueryRoot, keineAktionStore } from '@/network/keine-aktion-store'
import { networkStore } from '@/network/store'
import { useTakeoverProgressActions } from './takeover-progress-store'

type TakeoverStatus =
  /** Nothing waits. */
  | { kind: 'idle' }
  /** Markings wait, and the login state is still being checked. */
  | { kind: 'checking' }
  /** Markings wait for the login. */
  | { kind: 'needs-login'; waiting: number; loginConfigured: boolean }
  | { kind: 'transferring'; waiting: number }
  | { kind: 'done'; result: TransferResult }
  | { kind: 'error'; waiting: number; message: string }

/**
 * The old "Keine Aktion nötig" list of this browser moves into the database once, as soon as
 * writing is possible (logged in, or test mode). The query is shared by everything that calls this
 * hook, so it runs once. The local key goes only after every batch succeeded.
 */
export function useKeineAktionTakeover() {
  const auth = useOsmAuth()
  const queryClient = useQueryClient()
  const { set: setProgress, reset: resetProgress } = useTakeoverProgressActions()
  const waiting = countLocalKeineAktion(browserStorage())
  const canWrite = networkStore.mode === 'lokal' || auth.authenticated
  const takeover = useQuery({
    queryKey: ['na-keine-aktion-takeover'],
    queryFn: async () => {
      resetProgress()
      const result = await takeOverLocalKeineAktion(keineAktionStore, browserStorage(), setProgress)
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

  let status: TakeoverStatus = { kind: 'idle' }
  if (takeover.isFetching) {
    status = { kind: 'transferring', waiting }
  } else if (takeover.isError) {
    status = { kind: 'error', waiting, message: takeover.error.message }
  } else if (takeover.data) {
    status = { kind: 'done', result: takeover.data }
  } else if (waiting > 0 && canWrite) {
    status = { kind: 'transferring', waiting }
  } else if (waiting > 0 && !auth.ready) {
    status = { kind: 'checking' }
  } else if (waiting > 0 && !canWrite) {
    status = { kind: 'needs-login', waiting, loginConfigured: auth.configured }
  }

  return { status, retry: () => void takeover.refetch(), login: auth.login, waiting }
}
