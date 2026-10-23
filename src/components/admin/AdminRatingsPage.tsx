import { DataTablePage, type DataColumn } from '@shared/components/data/DataTablePage'
import { Subheading } from '@shared/components/ui/heading'
import { Text } from '@shared/components/ui/text'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { RatingStoreEntry } from '@/shared/ratings/rating-store'
import { allRatingsQueryKey, ratingStore } from '@/shared/ratings/ratings-query'
import { rapidAttributeKeys, rapidAttributeMeta } from '@/shared/ratings/schema'

function matchesQuery(entry: RatingStoreEntry, q: string) {
  const haystack = [
    entry.dataset,
    entry.nodeId,
    entry.record.Kommentar ?? '',
    entry.record.Kommentar_intern ?? '',
    entry.record.Quelle ?? '',
    entry.record.created_by,
    entry.record.updated_by,
    entry.record.qa,
    entry.record.status,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q.toLowerCase())
}

export function AdminRatingsPage() {
  const navigate = useNavigate({ from: '/data' })
  const { dataset, node, q } = useSearch({ from: '/data' })

  const entriesQuery = useQuery({
    queryKey: allRatingsQueryKey,
    queryFn: () => ratingStore.listAll(),
  })

  const entries = entriesQuery.data ?? []
  const filtered = entries.filter((entry) => {
    if (dataset && entry.dataset !== dataset) return false
    if (q && !matchesQuery(entry, q)) return false
    return true
  })
  const selected =
    dataset && node
      ? (filtered.find((entry) => entry.dataset === dataset && entry.nodeId === node) ??
        entries.find((entry) => entry.dataset === dataset && entry.nodeId === node))
      : undefined

  const columns: DataColumn<RatingStoreEntry>[] = [
    { header: 'Gebiet', cell: (entry) => entry.dataset, className: 'font-medium' },
    {
      header: 'Knoten',
      cell: (entry) => entry.nodeId,
      className: 'max-w-48 truncate text-zinc-400',
    },
    { header: 'Status', cell: (entry) => entry.record.status },
    { header: 'QA', cell: (entry) => entry.record.qa },
    { header: 'Skip', cell: (entry) => (entry.record.KP_Nichtbetrachten === 1 ? 'ja' : 'nein') },
    ...rapidAttributeKeys.map((key) => ({
      header: key,
      cell: (entry: RatingStoreEntry) => String(entry.record[key] ?? '—'),
    })),
    { header: 'Von', cell: (entry) => entry.record.created_by, className: 'text-zinc-400' },
    {
      header: 'Aktualisiert',
      cell: (entry) => entry.record.updated_at.slice(0, 10),
      className: 'text-zinc-400',
    },
  ]

  return (
    <DataTablePage
      title="Bewertungs-Datenbank"
      scope={
        dataset
          ? `Alle Bewertungen des Projekts „${dataset}“ in der gemeinsamen Datenbank. Das Projekt wählst du im Schritt „Datensatz“.`
          : 'Kein Projekt gewählt: alle Bewertungen der gemeinsamen Datenbank. Ein Projekt wählst du im Schritt „Datensatz“.'
      }
      searchValue={q}
      searchPlaceholder="Knoten, Hinweis, Autor…"
      searchLabel="Bewertungen durchsuchen"
      onSearchChange={(value) => {
        void navigate({
          search: (previous) => ({ ...previous, q: value }),
          replace: true,
        })
      }}
      status={entriesQuery}
      pendingText="Lade Bewertungen…"
      emptyText="Keine Bewertungen in dieser Auswahl."
      errorText="Bewertungen konnten nicht geladen werden."
      rows={filtered}
      columns={columns}
      rowKey={(entry) => `${entry.dataset}:${entry.nodeId}`}
      selectedKey={selected ? `${selected.dataset}:${selected.nodeId}` : undefined}
      onSelect={(entry) => {
        void navigate({
          search: (previous) => ({
            ...previous,
            dataset: entry.dataset,
            node: entry.nodeId,
          }),
          replace: true,
        })
      }}
      tableTestId="admin-ratings-table"
      rowTestId={(entry) => `admin-row-${entry.dataset}-${entry.nodeId}`}
      aside={
        selected ? (
          <>
            <Subheading>
              {selected.dataset}:{selected.nodeId}
            </Subheading>
            <Text className="mt-2">
              {selected.record.created_by} · {selected.record.status} · QA {selected.record.qa}
            </Text>
            <dl className="mt-3 space-y-1 text-sm">
              {rapidAttributeKeys.map((key) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-zinc-400">{rapidAttributeMeta[key].title}</dt>
                  <dd>{String(selected.record[key] ?? '—')}</dd>
                </div>
              ))}
              {(
                [
                  ['Hinweis an den Kunden', selected.record.Kommentar],
                  ['Hinweis intern', selected.record.Kommentar_intern],
                  ['Quelle', selected.record.Quelle],
                  ['Mapillary-Fotos', selected.record['Mapillary-ID']],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt className="shrink-0 text-zinc-400">{label}</dt>
                  <dd className="min-w-0 text-right break-words">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <>
            <Subheading>Keine Zeile gewählt</Subheading>
            <Text className="mt-2">Eine Bewertung in der Tabelle anklicken.</Text>
          </>
        )
      }
    />
  )
}
