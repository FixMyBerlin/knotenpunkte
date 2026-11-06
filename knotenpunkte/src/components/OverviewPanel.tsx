import { cn } from '@shared/cn'
import { Button } from '@shared/components/ui/button'
import { Field, Label } from '@shared/components/ui/fieldset'
import { Subheading } from '@shared/components/ui/heading'
import { Input } from '@shared/components/ui/input'
import { kvQueryOptions } from '@shared/kv/query-options'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { StatusFilterControl } from '@/components/StatusFilterControl'
import { Route } from '@/routes/index'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import { searchNodeIds } from '@/shared/nodes/search'
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

  const [query, setQuery] = useState('')

  const records = ratingsQuery.data ?? {}
  const allFeatures = nodesQuery.data?.collection.features ?? []
  const searching = query.trim() !== ''
  // A search looks at every node, whatever the status filter; the status stays in the row.
  const byId = new Map(allFeatures.map((feature) => [feature.properties.id, feature]))
  const features = searching
    ? searchNodeIds([...byId.keys()], query).map((id) => byId.get(id)!)
    : allFeatures.filter((feature) =>
        matchesStatusFilter(records[feature.properties.id], statusFilter),
      )

  function openInWork(id: string) {
    void navigate({ search: (previous) => ({ ...previous, node: id, step: 'work' }) })
  }

  /** Marks the node and moves the overview map to it (see `RatingMap`). */
  function showOnMap(id: string) {
    void navigate({ search: (previous) => ({ ...previous, node: id }), replace: true })
  }

  return (
    <section className="space-y-4">
      <Subheading>Übersicht</Subheading>
      <Field>
        <Label>Knotenpunkt suchen</Label>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && features[0]) showOnMap(features[0].properties.id)
            if (event.key === 'Escape') setQuery('')
          }}
          placeholder="ID, z. B. 40530022"
          autoComplete="off"
          data-testid="overview-search"
        />
      </Field>
      {searching ? (
        <p className="text-xs text-zinc-400" data-testid="overview-search-hint">
          {features.length === 1 ? '1 Treffer' : `${features.length} Treffer`} in allen Knoten.
          Klick oder Enter zeigt den Knoten auf der Karte.
        </p>
      ) : (
        <StatusFilterControl />
      )}
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
                onClick={() => (searching ? showOnMap(id) : openInWork(id))}
              >
                <span className="min-w-0">
                  {searching ? `${id} (${statusLabel(record)})` : id}
                  {deferNote ? (
                    <span className="block truncate text-xs text-zinc-400" title={deferNote}>
                      {deferNote}
                    </span>
                  ) : null}
                </span>
                {searching ? null : (
                  <span className="shrink-0 text-xs text-zinc-400">{statusLabel(record)}</span>
                )}
              </button>
              {searching && selected ? (
                <Button
                  className="mt-1 mb-2 w-full"
                  onClick={() => openInWork(id)}
                  data-testid="overview-search-open"
                >
                  In Bewerten öffnen
                </Button>
              ) : null}
            </li>
          )
        })}
      </ul>
      {features.length === 0 ? (
        <p className="text-sm text-zinc-400">
          {searching ? 'Kein Knoten mit dieser ID.' : 'Keine Knoten in diesem Filter.'}
        </p>
      ) : null}
    </section>
  )
}
