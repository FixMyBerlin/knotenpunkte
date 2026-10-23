import { cn } from '@shared/cn'
import { Callout } from '@shared/components/ui/callout'
import { Field, Label } from '@shared/components/ui/fieldset'
import { Heading, Subheading } from '@shared/components/ui/heading'
import { Input } from '@shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/components/ui/table'
import { Text } from '@shared/components/ui/text'
import { ignorePasswordManagerProps } from '@shared/form-ignore-password-manager'
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

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-8 px-4 py-6 lg:flex-row lg:px-8">
      <div className="min-w-0 flex-1">
        <Heading level={2}>Bewertungs-Datenbank</Heading>
        <Text className="mt-2" data-testid="data-page-scope">
          {dataset
            ? `Alle Bewertungen des Projekts „${dataset}“ in der gemeinsamen Datenbank. Das Projekt wählst du im Schritt „Datensatz“.`
            : 'Kein Projekt gewählt: alle Bewertungen der gemeinsamen Datenbank. Ein Projekt wählst du im Schritt „Datensatz“.'}
        </Text>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <Field className="min-w-64 flex-1">
            <Label>Suche</Label>
            <Input
              value={q ?? ''}
              placeholder="Knoten, Hinweis, Autor…"
              aria-label="Bewertungen durchsuchen"
              {...ignorePasswordManagerProps}
              onChange={(event) => {
                const value = event.currentTarget.value.trim() || undefined
                void navigate({
                  search: (previous) => ({ ...previous, q: value }),
                  replace: true,
                })
              }}
            />
          </Field>
        </div>

        {entriesQuery.isError ? (
          <Callout className="mt-4" tone="error" title="Laden fehlgeschlagen">
            {entriesQuery.error instanceof Error
              ? entriesQuery.error.message
              : 'Bewertungen konnten nicht geladen werden.'}
          </Callout>
        ) : null}

        {entriesQuery.isPending ? (
          <Text className="mt-6">Lade Bewertungen…</Text>
        ) : filtered.length === 0 ? (
          <Text className="mt-6">Keine Bewertungen in dieser Auswahl.</Text>
        ) : (
          <Table
            className="mt-4 [--gutter:--spacing(4)] lg:[--gutter:--spacing(6)]"
            dense
            striped
            data-testid="admin-ratings-table"
          >
            <TableHead>
              <TableRow>
                <TableHeader>Gebiet</TableHeader>
                <TableHeader>Knoten</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>QA</TableHeader>
                <TableHeader>Skip</TableHeader>
                {rapidAttributeKeys.map((key) => (
                  <TableHeader key={key}>{key}</TableHeader>
                ))}
                <TableHeader>Von</TableHeader>
                <TableHeader>Aktualisiert</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((entry) => {
                const isSelected =
                  selected?.dataset === entry.dataset && selected.nodeId === entry.nodeId
                return (
                  <TableRow
                    key={`${entry.dataset}:${entry.nodeId}`}
                    className={cn(
                      'cursor-pointer hover:bg-white/5',
                      isSelected && 'bg-sky-500/15 hover:bg-sky-500/20',
                    )}
                    data-testid={`admin-row-${entry.dataset}-${entry.nodeId}`}
                    onClick={() => {
                      void navigate({
                        search: (previous) => ({
                          ...previous,
                          dataset: entry.dataset,
                          node: entry.nodeId,
                        }),
                        replace: true,
                      })
                    }}
                  >
                    <TableCell className="font-medium">{entry.dataset}</TableCell>
                    <TableCell className="max-w-48 truncate text-zinc-400">
                      {entry.nodeId}
                    </TableCell>
                    <TableCell>{entry.record.status}</TableCell>
                    <TableCell>{entry.record.qa}</TableCell>
                    <TableCell>{entry.record.KP_Nichtbetrachten === 1 ? 'ja' : 'nein'}</TableCell>
                    {rapidAttributeKeys.map((key) => (
                      <TableCell key={key}>{String(entry.record[key] ?? '—')}</TableCell>
                    ))}
                    <TableCell className="text-zinc-400">{entry.record.created_by}</TableCell>
                    <TableCell className="text-zinc-400">
                      {entry.record.updated_at.slice(0, 10)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <aside className="w-full shrink-0 lg:w-96">
        <div className="rounded-lg p-4 ring-1 ring-white/10 lg:sticky lg:top-4">
          {selected ? (
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
          )}
        </div>
      </aside>
    </div>
  )
}
