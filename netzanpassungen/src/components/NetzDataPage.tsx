import { AppHeader } from '@shared/components/AppHeader'
import { DataTablePage, type DataColumn } from '@shared/components/data/DataTablePage'
import { Subheading } from '@shared/components/ui/heading'
import { Text } from '@shared/components/ui/text'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { NetzDataLink } from '@/components/NetzDataLink'
import { useNetwork, useNetzNav } from '@/components/use-netz'
import { appTitle } from '@/config/app.const'
import { nodeName } from '@/network/element-nr'
import { lineLengthM } from '@/network/geo'
import { newEdgeKey, virtualNodeKey, type Network } from '@/network/model'
import type { Stored } from '@/network/schema'

function entryKey(entry: Stored) {
  return entry.data.kind === 'virtual_node' ? virtualNodeKey(entry.id) : newEdgeKey(entry.id)
}

function entryLabel(entry: Stored, network: Network | null, elementNrs: Map<string, string>) {
  if (entry.data.kind === 'virtual_node') return entry.data.name
  return elementNrs.get(newEdgeKey(entry.id)) ?? entry.id.slice(0, 8)
}

export function NetzDataPage() {
  const { steps, goToStep, search } = useNetzNav()
  const navigate = useNavigate({ from: '/data' })
  const { q, sel, gebiet } = useSearch({ from: '/data' })
  const { network, entries, elementNrs, entriesQuery } = useNetwork(gebiet)

  const rows = [...entries]
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    .filter((entry) => {
      if (!q) return true
      const haystack = [
        entryLabel(entry, network, elementNrs),
        entry.data.kommentar ?? '',
        entry.created_by,
        entry.updated_by,
        entry.data.kind === 'new_edge' ? (entry.data.routen_fernradweg ?? '') : '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q.toLowerCase())
    })
  const selected = entries.find((entry) => entryKey(entry) === sel)

  const columns: DataColumn<Stored>[] = [
    { header: 'Art', cell: (entry) => (entry.data.kind === 'virtual_node' ? 'Knoten' : 'Kante') },
    {
      header: 'Name / Elementnummer',
      cell: (entry) => entryLabel(entry, network, elementNrs),
      className: 'font-medium',
    },
    {
      header: 'von – bis',
      cell: (entry) =>
        entry.data.kind === 'new_edge' && network
          ? `${nodeName(network, entry.data.von)} – ${nodeName(network, entry.data.bis)}`
          : '',
      className: 'text-zinc-400',
    },
    {
      header: 'Länge',
      cell: (entry) =>
        entry.data.kind === 'new_edge'
          ? `${Math.round(lineLengthM(entry.data.coordinates))} m`
          : '',
    },
    { header: 'Gelöscht', cell: (entry) => (entry.data.geloescht ? 'ja' : '') },
    { header: 'Von', cell: (entry) => entry.updated_by, className: 'text-zinc-400' },
    {
      header: 'Aktualisiert',
      cell: (entry) => entry.updated_at.slice(0, 10),
      className: 'text-zinc-400',
    },
  ]

  return (
    <div className="flex h-full w-full flex-col bg-zinc-950">
      <AppHeader
        title={appTitle}
        steps={steps}
        onSelect={goToStep}
        actions={<NetzDataLink dataPage search={search} />}
      />
      <main className="min-h-0 flex-1 overflow-auto">
        <DataTablePage
          title="Datenbank"
          scope={
            gebiet
              ? `Gezeichnete Kanten und virtuelle Knoten im Gebiet „${gebiet}“, gelöschte eingeschlossen. Das Gebiet wählst du im Schritt „Gebiet“.`
              : 'Kein Gebiet gewählt. Das Gebiet wählst du im Schritt „Gebiet“.'
          }
          searchValue={q}
          searchPlaceholder="Name, Elementnummer, Kommentar, Autor…"
          searchLabel="Einträge durchsuchen"
          onSearchChange={(value) => {
            void navigate({ search: (previous) => ({ ...previous, q: value }), replace: true })
          }}
          status={entriesQuery}
          pendingText={gebiet ? 'Lade Einträge…' : 'Kein Gebiet gewählt.'}
          emptyText="Keine Einträge in dieser Auswahl."
          errorText="Einträge konnten nicht geladen werden."
          rows={rows}
          columns={columns}
          rowKey={entryKey}
          selectedKey={sel}
          onSelect={(entry) => {
            void navigate({
              search: (previous) => ({ ...previous, sel: entryKey(entry) }),
              replace: true,
            })
          }}
          aside={
            selected ? (
              <>
                <Subheading>{entryLabel(selected, network, elementNrs)}</Subheading>
                <Text className="mt-2">
                  Angelegt von {selected.created_by} am {selected.created_at.slice(0, 10)}, zuletzt{' '}
                  {selected.updated_by} am {selected.updated_at.slice(0, 10)} (Version{' '}
                  {selected.version}).
                </Text>
                <pre className="mt-3 overflow-x-auto rounded bg-black/30 p-2 text-xs text-zinc-300">
                  {JSON.stringify(selected.data, null, 2)}
                </pre>
              </>
            ) : (
              <>
                <Subheading>Keine Zeile gewählt</Subheading>
                <Text className="mt-2">Einen Eintrag in der Tabelle anklicken.</Text>
              </>
            )
          }
        />
      </main>
    </div>
  )
}
