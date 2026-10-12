import { useMutation, useQuery } from '@tanstack/react-query'
import { useOsmAuth } from '@/components/shared/use-osm-auth'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Subheading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { Route } from '@/routes/index'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import {
  buildAllRatingsFile,
  buildRatingsFile,
  downloadJson,
  exportFilename,
  exportGeojsonFilename,
  mergeRatingsIntoNodes,
} from '@/shared/ratings/export-ratings'
import { osmLoginRequiredMessage } from '@/shared/ratings/kv-rating-store'
import {
  ratingStore,
  ratingsQueryKey,
  unreadableRatingsQueryKey,
} from '@/shared/ratings/ratings-query'

export function ExportPanel() {
  const dataset = Route.useSearch({ select: (search) => search.dataset })
  const auth = useOsmAuth()
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

  const unreadableQuery = useQuery({
    queryKey: unreadableRatingsQueryKey(dataset ?? ''),
    queryFn: () => ratingStore.listUnreadable(dataset!),
    enabled: Boolean(dataset),
    staleTime: Infinity,
  })
  const unreadable = unreadableQuery.data ?? []

  const exportAll = useMutation({
    mutationFn: async () => {
      const summaries = await ratingStore.listDatasetSummaries()
      const datasets: Record<string, Awaited<ReturnType<typeof ratingStore.list>>> = {}
      for (const summary of summaries) {
        datasets[summary.dataset] = await ratingStore.list(summary.dataset)
      }
      return buildAllRatingsFile(datasets)
    },
    onSuccess: (file) => {
      downloadJson(exportFilename('ratings', 'all'), file)
    },
  })

  if (!dataset) return null

  const records = ratingsQuery.data ?? {}
  const hasNodes = Boolean(nodesQuery.data)

  return (
    <section className="space-y-5">
      <div>
        <Subheading className="mb-2">Export</Subheading>
        <Text>
          {auth.authenticated
            ? `Gespeichert als ${auth.displayName ?? 'OSM-Nutzer'} in der Datenbank.`
            : 'Bewertungen liegen in der gemeinsamen Datenbank. Lesen ist öffentlich; Speichern erfordert OSM-Anmeldung.'}{' '}
          Alle Exporte enthalten beide Hinweise (an den Kunden und intern), die Quelle und die
          zugeordneten Mapillary-Fotos.
        </Text>
      </div>

      {unreadable.length > 0 ? (
        <Callout tone="error" title="Nicht lesbare Einträge" data-testid="export-unreadable">
          {unreadable.length === 1 ? 'Ein Eintrag' : `${unreadable.length} Einträge`} in der
          Datenbank {unreadable.length === 1 ? 'ist' : 'sind'} nicht lesbar und{' '}
          {unreadable.length === 1 ? 'fehlt' : 'fehlen'} in den Exporten: {unreadable.join(', ')}.
          Bitte an die Entwicklung melden.
        </Callout>
      ) : null}

      <ExportGroup
        title="Ergebnis für GIS (GeoJSON)"
        description={`Alle Knoten von „${dataset}“ als Punkte, jeder mit den Angaben aus der importierten Datei und seiner Bewertung als Attribute. Auch unbewertete Knoten sind enthalten. Ohne Verlauf. Zum Öffnen in QGIS und für die Abgabe.`}
      >
        {hasNodes ? (
          <Button
            type="button"
            data-testid="export-geojson"
            onClick={() => {
              downloadJson(
                exportGeojsonFilename(dataset),
                mergeRatingsIntoNodes(nodesQuery.data!.collection, records),
              )
            }}
          >
            GeoJSON exportieren
          </Button>
        ) : (
          <Callout>Dafür muss die Knoten-Datei dieses Gebiets importiert sein.</Callout>
        )}
      </ExportGroup>

      <ExportGroup
        title="Bewertungen dieses Gebiets (JSON)"
        description={`Nur die Bewertungen von „${dataset}“, ohne Geometrie und nur für bewertete Knoten. Vollständig: mit Verlauf (wer hat wann was gesetzt), Prüfstatus und der Übernahme von Vorschlägen. Als Sicherung und zur Auswertung.`}
      >
        <Button
          type="button"
          outline
          data-testid="export-json"
          onClick={() => {
            downloadJson(exportFilename('ratings', dataset), buildRatingsFile(dataset, records))
          }}
        >
          JSON exportieren
        </Button>
      </ExportGroup>

      <ExportGroup
        title="Bewertungen aller Gebiete (JSON)"
        description="Wie der Export darüber, aber für alle Gebiete der Datenbank in einer Datei. Als vollständige Sicherung."
      >
        <Button
          type="button"
          outline
          data-testid="export-all-json"
          disabled={exportAll.isPending}
          onClick={() => exportAll.mutate()}
        >
          Alle Bewertungen exportieren
        </Button>
        {exportAll.isError ? (
          <Callout className="mt-2" tone="error">
            {exportAll.error instanceof Error ? exportAll.error.message : 'Export fehlgeschlagen'}
          </Callout>
        ) : null}
      </ExportGroup>

      {!auth.authenticated ? <Callout>{osmLoginRequiredMessage}</Callout> : null}
    </section>
  )
}

function ExportGroup({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg p-3 ring-1 ring-white/10">
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <p className="mt-1 mb-2 text-xs text-zinc-400">{description}</p>
      {children}
    </div>
  )
}
