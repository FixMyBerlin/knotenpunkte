import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { loadEdges } from '@/data/edges'
import { useNowActions } from '@/data/now-store'
import { loadProgress } from '@/data/progress'
import { buildDataset } from '@/stats/model'

const edgesQueryKey = ['fp', 'edges'] as const
const progressQueryKey = ['fp', 'progress'] as const

const cachedQuery = { staleTime: Infinity, gcTime: Infinity, retry: false } as const

/** Network and done marks joined; `dataset` is `null` until both are there. */
export function useDataset() {
  const edges = useQuery({ queryKey: edgesQueryKey, queryFn: () => loadEdges(), ...cachedQuery })
  const progress = useQuery({
    queryKey: progressQueryKey,
    queryFn: () => loadProgress(),
    ...cachedQuery,
  })
  const dataset =
    edges.data && progress.data ? buildDataset(edges.data.edges, progress.data.marks) : null
  return { dataset, edges, progress }
}

/** "Neu laden": both sources from the network, cache replaced. */
export function useReload() {
  const queryClient = useQueryClient()
  const { refresh } = useNowActions()
  return useMutation({
    mutationFn: async () => {
      const [edges, progress] = await Promise.allSettled([loadEdges(true), loadProgress(true)])
      if (edges.status === 'fulfilled') queryClient.setQueryData(edgesQueryKey, edges.value)
      if (progress.status === 'fulfilled')
        queryClient.setQueryData(progressQueryKey, progress.value)
      refresh()
      const failed = [edges, progress].find((result) => result.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
    },
  })
}
