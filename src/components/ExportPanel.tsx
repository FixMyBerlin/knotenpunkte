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
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'

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
    <section>
      <Subheading className="mb-2">Bewertungen</Subheading>
      <Text className="mb-2">
        {auth.authenticated
          ? `Gespeichert als ${auth.displayName ?? 'OSM-Nutzer'} in der Datenbank`
          : 'Bewertungen liegen in der gemeinsamen Datenbank. Lesen ist öffentlich; Speichern erfordert OSM-Anmeldung.'}
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="export-json"
          onClick={() => {
            downloadJson(exportFilename('ratings', dataset), buildRatingsFile(dataset, records))
          }}
        >
          JSON exportieren
        </Button>
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
        ) : null}
        <Button
          type="button"
          outline
          data-testid="export-all-json"
          disabled={exportAll.isPending}
          onClick={() => exportAll.mutate()}
        >
          Alle Bewertungen exportieren
        </Button>
      </div>
      {exportAll.isError ? (
        <Callout className="mt-2" tone="error">
          {exportAll.error instanceof Error ? exportAll.error.message : 'Export fehlgeschlagen'}
        </Callout>
      ) : null}
      {!auth.authenticated ? <Callout className="mt-2">{osmLoginRequiredMessage}</Callout> : null}
    </section>
  )
}
