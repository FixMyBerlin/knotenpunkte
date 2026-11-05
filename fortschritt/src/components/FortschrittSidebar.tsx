import { Callout } from '@shared/components/ui/callout'
import { MapFilters } from '@/components/map/MapFilters'
import { MapSelectionPanel } from '@/components/map/MapSelectionPanel'
import { ReportNav } from '@/components/report/ReportNav'
import { useDataset, useReload } from '@/data/use-data'
import type { AppView } from '@/routing/search-schema'
import { formatCount, formatStamp, formatStampRelative } from '@/stats/format'

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function FortschrittSidebar({ view }: { view: AppView }) {
  const { dataset, edges, progress } = useDataset()
  const reload = useReload()
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-sm">
      <ReportNav />
      <hr className="border-white/10" />
      {view === 'karte' && dataset ? (
        <>
          <MapFilters dataset={dataset} />
          <MapSelectionPanel dataset={dataset} />
        </>
      ) : null}

      {progress.data?.error ? (
        <Callout tone="warning" title="Markierungen aus dem Cache" data-testid="progress-warning">
          {progress.data.error}
        </Callout>
      ) : null}
      {edges.data?.stale ? (
        <Callout tone="warning" title="Netz aus dem Cache">
          TILDA war nicht erreichbar. Die Zahlen nutzen das zuletzt geladene Netz.
        </Callout>
      ) : null}
      {reload.error ? (
        <Callout tone="error" title="Neu laden fehlgeschlagen">
          {errorText(reload.error)}
        </Callout>
      ) : null}
      {dataset && dataset.orphanMarks > 0 ? (
        <p className="text-xs text-amber-300" data-testid="orphan-marks">
          {formatCount(dataset.orphanMarks)} Markierungen ohne Kante (ihre id fehlt im Netz).
        </p>
      ) : null}
      {dataset && dataset.unknownBezirke.length > 0 ? (
        <p className="text-xs text-amber-300">
          Bezirke ohne Lieferung im Plan: {dataset.unknownBezirke.join(', ')}. Sie zählen nicht mit.
        </p>
      ) : null}

      <section className="space-y-1 text-xs text-zinc-400">
        <h2 className="font-medium text-zinc-300">Daten</h2>
        {edges.data ? (
          <p>
            Netz: {formatCount(edges.data.edges.length)} Kanten, geladen{' '}
            <span title={formatStamp(edges.data.loadedAt)}>
              {formatStampRelative(edges.data.loadedAt)}
            </span>
          </p>
        ) : null}
        {progress.data ? (
          <p>
            Markierungen: {formatCount(progress.data.marks.length)}, geladen{' '}
            <span title={formatStamp(progress.data.loadedAt)}>
              {formatStampRelative(progress.data.loadedAt)}
            </span>
          </p>
        ) : null}
        <p>
          Beides liegt in diesem Browser und wird höchstens einmal am Tag neu geladen, das Netz
          auch, wenn sich die Datei bei TILDA geändert hat.
        </p>
      </section>

      <section className="space-y-1 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
        <h2 className="font-medium text-zinc-300">Datum einer Erledigung</h2>
        <p>
          Das Datum einer Kante ist der Zeitpunkt, an dem sie im Editor als erledigt markiert wurde,
          nicht der Zeitpunkt der Änderung in OSM. Wird eine Markierung zurückgenommen und neu
          gesetzt, zählt das neue Datum. Frühere Wochen können sich dadurch nachträglich leicht
          verschieben.
        </p>
      </section>
    </div>
  )
}
