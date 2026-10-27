import { cn } from '@shared/cn'
import { Subheading } from '@shared/components/ui/heading'
import { kvQueryOptions } from '@shared/kv/query-options'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { StatusFilterControl } from '@/components/StatusFilterControl'
import { Route } from '@/routes/index'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import { isDeferred, matchesStatusFilter } from '@/shared/ratings/queue'
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'
import type { RatingRecord } from '@/shared/ratings/schema'
import { resolveStatusFilter } from '@/shared/routing/search-schema'

function statusLabel(record: RatingRecord | undefined) {
  if (record?.qa === 'corrected') return 'Korrigiert'
  if (record?.qa === 'confirmed') return 'Bestätigt'
  if (record?.status === 'complete') return 'Bewertet'
  if (isDeferred(record)) return 'Zurückgestellt'
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
    ...kvQueryOptions,
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
          const record = records[id]
          // Why the node was put off.
          const deferNote = isDeferred(record) ? record?.Kommentar_intern?.trim() : undefined
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
                <span className="min-w-0">
                  {id}
                  {deferNote ? (
                    <span className="block truncate text-xs text-zinc-400" title={deferNote}>
                      {deferNote}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-zinc-400">{statusLabel(record)}</span>
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
