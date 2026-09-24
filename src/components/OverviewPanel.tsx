import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { StatusFilterControl } from '@/components/StatusFilterControl'
import { Subheading } from '@/components/ui/heading'
import { Route } from '@/routes/index'
import { cn } from '@/shared/cn'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import { matchesStatusFilter } from '@/shared/ratings/queue'
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'
import { resolveStatusFilter } from '@/shared/routing/search-schema'

function statusLabel(record: { status?: string; qa?: string } | undefined) {
  if (record?.qa === 'corrected') return 'Korrigiert'
  if (record?.qa === 'confirmed') return 'Bestätigt'
  if (record?.status === 'complete') return 'Bewertet'
  return 'Offen'
}

export function OverviewPanel() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const { dataset, node } = search
  const statusFilter = resolveStatusFilter(search)

  const nodesQuery = useQuery({
    queryKey: ['dataset', dataset],
    queryFn: () => loadNodes(dataset!),
    enabled: Boolean(dataset),
  })
  const ratingsQuery = useQuery({
    queryKey: ratingsQueryKey(dataset ?? ''),
    queryFn: () => ratingStore.list(dataset!),
    enabled: Boolean(dataset),
  })

  const records = ratingsQuery.data ?? {}
  const features = (nodesQuery.data?.collection.features ?? []).filter((feature) =>
    matchesStatusFilter(records[feature.properties.id], statusFilter),
  )

  return (
    <section className="space-y-4">
      <Subheading>Übersicht</Subheading>
      <StatusFilterControl />
      <ul className="max-h-[calc(100dvh-16rem)] space-y-1 overflow-y-auto text-sm">
        {features.map((feature) => {
          const id = feature.properties.id
          const selected = id === node
          return (
            <li key={id}>
              <button
                type="button"
                data-testid={`overview-node-${id}`}
                className={cn(
                  'flex w-full items-baseline justify-between gap-2 rounded-md px-2 py-1.5 text-left',
                  selected ? 'bg-white/10 text-sky-200' : 'hover:bg-white/5',
                )}
                onClick={() => {
                  void navigate({
                    search: (previous) => ({
                      ...previous,
                      node: id,
                      step: 'work',
                    }),
                  })
                }}
              >
                <span>{id}</span>
                <span className="text-xs text-zinc-400">{statusLabel(records[id])}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {features.length === 0 ? (
        <p className="text-sm text-zinc-400">Keine Knoten in diesem Filter.</p>
      ) : null}
    </section>
  )
}
