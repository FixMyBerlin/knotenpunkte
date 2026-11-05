import { kvQueryOptions } from '@shared/kv/query-options'
import { useIsFetching, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useDrawActions } from '@/components/draw-store'
import {
  browserStorage,
  hiddenKeineAktionIds,
  localKeineAktionText,
  parseIdRecord,
  type KeineAktion,
} from '@/network/keine-aktion'
import {
  keineAktionQueryKey,
  keineAktionQueryRoot,
  keineAktionStore,
} from '@/network/keine-aktion-store'

const noDecisions: KeineAktion[] = []

/** The shared "Keine Aktion nötig" decisions of the area. */
function useKeineAktion(gebiet: string | undefined) {
  const query = useQuery({
    queryKey: keineAktionQueryKey(gebiet ?? ''),
    queryFn: () => keineAktionStore.list(gebiet!),
    enabled: Boolean(gebiet),
    ...kvQueryOptions,
  })
  return { decisions: query.data ?? noDecisions, query }
}

/**
 * The suggestion ids of the area marked "Keine Aktion nötig": the shared decisions, plus this
 * browser's markings that still wait for the transfer (`localOnly` counts those).
 */
export function useNoActionIds(gebiet: string | undefined) {
  const { decisions, query } = useKeineAktion(gebiet)
  // The transfer clears the local list and then refetches these queries: this re-renders at that point.
  useIsFetching({ queryKey: keineAktionQueryRoot })
  // The text, not the parsed record: an unchanged text keeps the memoized ids.
  const waitingText = localKeineAktionText(browserStorage())
  const ids = useMemo(() => {
    const decided = decisions.map((item) => item.suggestionId)
    return hiddenKeineAktionIds(decided, parseIdRecord(waitingText) ?? {}, gebiet ?? '')
  }, [decisions, waitingText, gebiet])
  const sharedIds = useMemo(() => new Set(decisions.map((item) => item.suggestionId)), [decisions])
  const localOnly = useMemo(
    () => [...ids].filter((id) => !sharedIds.has(id)).length,
    [ids, sharedIds],
  )
  return { ids, localOnly, decisions, query }
}

/** "Keine Aktion nötig" for one suggestion. Needs the OSM login, like every other write. */
export function useMarkKeineAktion(gebiet: string | undefined) {
  const queryClient = useQueryClient()
  const { setMessage } = useDrawActions()
  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!gebiet) throw new Error('Kein Gebiet gewählt')
      return keineAktionStore.put(gebiet, suggestionId)
    },
    onSuccess: (saved) => {
      if (!gebiet) return
      const key = keineAktionQueryKey(gebiet)
      if (queryClient.getQueryData<KeineAktion[]>(key)) {
        queryClient.setQueryData<KeineAktion[]>(key, (list) => [
          ...(list ?? []).filter((item) => item.suggestionId !== saved.suggestionId),
          saved,
        ])
      } else {
        // Not loaded yet: a list with only this one would look complete.
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
    onError: (error) => {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
      })
    },
  })
}

/** "fmc_9: 5, fmc_10: 2" – who decided how many. */
export function decidersText(decisions: KeineAktion[]) {
  const counts = new Map<string, number>()
  for (const { createdBy } of decisions) counts.set(createdBy, (counts.get(createdBy) ?? 0) + 1)
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `${name}: ${count}`)
    .join(', ')
}
