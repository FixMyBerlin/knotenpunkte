import type { StepNavItem } from '@shared/components/StepNav'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMatch, useNavigate, useRouterState } from '@tanstack/react-router'
import { useDrawActions } from '@/components/draw-store'
import { baseNetworkQueryKey, loadBaseNetwork } from '@/network/data-idb'
import type { EntryWrite } from '@/network/edit'
import { newEdgeElementNrs } from '@/network/element-nr'
import { buildNetwork } from '@/network/model'
import type { Stored } from '@/network/schema'
import {
  entriesQueryKey,
  NetworkConflictError,
  networkStore,
  type StoredList,
} from '@/network/store'
import { validateNetwork } from '@/network/validate'
import {
  appStepLabels,
  appSteps,
  resolveStep,
  type AppStep,
  type DataSearch,
  type IndexSearch,
} from '@/routing/search-schema'

function withoutDataQuery({ q: _q, ...search }: DataSearch): IndexSearch {
  return search
}

/** Search of the map page, also on the database page. */
function useNetzSearch() {
  const indexMatch = useMatch({ from: '/', shouldThrow: false })
  const dataMatch = useMatch({ from: '/data', shouldThrow: false })
  return indexMatch?.search ?? (dataMatch ? withoutDataQuery(dataMatch.search) : undefined)
}

/** The input file of the area with its index, and the entries drawn there. */
export function useNetwork(gebiet: string | undefined) {
  const baseQuery = useQuery({
    queryKey: baseNetworkQueryKey(gebiet ?? ''),
    queryFn: () => loadBaseNetwork(gebiet!),
    enabled: Boolean(gebiet),
    staleTime: Infinity,
    gcTime: Infinity,
  })
  const entriesQuery = useQuery({
    queryKey: entriesQueryKey(gebiet ?? ''),
    queryFn: () => networkStore.list(gebiet!),
    enabled: Boolean(gebiet),
  })
  const loaded = baseQuery.data ?? null
  const entries = entriesQuery.data?.entries ?? []
  const network = loaded ? buildNetwork(loaded.base, entries) : null
  const elementNrs = network ? newEdgeElementNrs(network) : new Map<string, string>()
  const issues = network ? validateNetwork(network) : []
  return {
    input: loaded?.stored ?? null,
    network,
    entries,
    unreadable: entriesQuery.data?.unreadable ?? [],
    elementNrs,
    issues,
    baseQuery,
    entriesQuery,
    /** Saving is possible once the stored entries are there. */
    ready: Boolean(network) && entriesQuery.isSuccess,
  }
}

function mergeEntries(list: StoredList | undefined, saved: Stored[]): StoredList {
  const byId = new Map((list?.entries ?? []).map((entry) => [entry.id, entry]))
  for (const entry of saved) byId.set(entry.id, entry)
  return { entries: [...byId.values()], unreadable: list?.unreadable ?? [] }
}

/** Saves entries one after another; on a conflict the current state is loaded again. */
export function useSaveEntries(gebiet: string | undefined) {
  const queryClient = useQueryClient()
  const { setMessage } = useDrawActions()
  return useMutation({
    mutationFn: async (writes: EntryWrite[]) => {
      if (!gebiet) throw new Error('Kein Gebiet gewählt')
      const saved: Stored[] = []
      try {
        for (const write of writes) {
          saved.push(await networkStore.put(gebiet, write.id, write.data))
        }
      } finally {
        // What got stored before an error stays in the cache.
        queryClient.setQueryData<StoredList>(entriesQueryKey(gebiet), (list) =>
          mergeEntries(list, saved),
        )
      }
      return saved
    },
    onError: (error) => {
      if (error instanceof NetworkConflictError && gebiet) {
        void queryClient.invalidateQueries({ queryKey: entriesQueryKey(gebiet) })
      }
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Speichern fehlgeschlagen',
      })
    },
  })
}

export function useNetzNav() {
  const navigate = useNavigate()
  const search = useNetzSearch()
  const isDataPage = useRouterState({ select: (state) => state.location.pathname === '/data' })
  const gebiet = search?.gebiet
  const current = isDataPage ? undefined : resolveStep(search ?? {})
  const { network, issues, input } = useNetwork(gebiet)

  function description(step: AppStep) {
    switch (step) {
      case 'gebiet':
        return gebiet ?? 'Kein Gebiet'
      case 'zeichnen':
        return network
          ? `${network.newEdges.length} Kanten · ${network.virtualNodes.length} Knoten`
          : 'Keine Daten'
      case 'uebersicht':
        return input ? `${input.file.luecken.features.length} Lücken` : 'Keine Daten'
      case 'export': {
        const errors = issues.filter((issue) => issue.level === 'fehler').length
        return errors > 0 ? `${errors} Fehler` : 'Bereit'
      }
    }
  }

  const steps: StepNavItem<AppStep>[] = appSteps.map((id) => ({
    id,
    label: appStepLabels[id],
    description: description(id),
    status: current === id ? 'current' : id === 'gebiet' && gebiet ? 'complete' : 'upcoming',
  }))

  function goToStep(id: AppStep) {
    void navigate({
      to: '/',
      search: search ? { ...search, step: id } : { step: id },
      replace: !isDataPage,
    })
  }

  return { search, gebiet, current, steps, goToStep, isDataPage }
}
