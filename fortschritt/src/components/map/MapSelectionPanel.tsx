import { XMarkIcon } from '@heroicons/react/20/solid'
import { serializeMapParam } from '@shared/map/map-param'
import { useMapSelection, useMapSelectionActions } from '@/components/map-selection-store'
import { ProgressBar } from '@/components/overview/ProgressBar'
import { tildaDataLayers, tildaRegionUrl } from '@/config/app.const'
import { useNow } from '@/data/now-store'
import { Route } from '@/routes/index'
import { searchMapParam } from '@/routing/search-schema'
import { gebietStats } from '@/stats/bezirke'
import { formatCount, formatDay, formatDayDistance, formatKm } from '@/stats/format'
import type { Dataset } from '@/stats/model'

export function MapSelectionPanel({ dataset }: { dataset: Dataset }) {
  const selection = useMapSelection()
  const search = Route.useSearch()
  const { clear } = useMapSelectionActions()
  if (!selection) {
    return (
      <p className="text-xs text-zinc-400">
        Klick auf ein Gebiet oder eine Kante zeigt die Zahlen.
      </p>
    )
  }

  const tildaUrl = `${tildaRegionUrl}?map=${serializeMapParam(searchMapParam(search))}&data=${tildaDataLayers.join(',')}`
  const linkClass = 'block text-sky-400 underline hover:text-sky-300'

  const editorLink = selection.editorUrl ? (
    <a href={selection.editorUrl} target="_blank" rel="noreferrer" className={linkClass}>
      Im Editor öffnen
    </a>
  ) : null

  return (
    <section
      className="relative space-y-2 rounded-lg bg-zinc-800/60 p-3 ring-1 ring-white/10"
      data-testid="map-selection"
    >
      <button
        type="button"
        onClick={clear}
        aria-label="Auswahl schließen"
        className="absolute top-2 right-2 rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
      >
        <XMarkIcon className="size-4" aria-hidden="true" />
      </button>
      {selection.kind === 'gebiet' ? (
        <GebietDetails dataset={dataset} bezirk={selection.bezirk} account={selection.account} />
      ) : (
        <EdgeDetails dataset={dataset} id={selection.id} strasse={selection.strasse} />
      )}
      <p className="text-xs text-zinc-400">
        {selection.bezirk} · {selection.account}
      </p>
      <a href={tildaUrl} target="_blank" rel="noreferrer" className={linkClass}>
        In TILDA öffnen
      </a>
      {editorLink}
    </section>
  )
}

function GebietDetails({
  dataset,
  bezirk,
  account,
}: {
  dataset: Dataset
  bezirk: string
  account: string
}) {
  const stats = gebietStats(dataset, bezirk, account)
  return (
    <>
      <h2 className="pr-6 font-medium text-zinc-100">Gebiet</h2>
      <ProgressBar share={stats.share} label={`Gebiet ${bezirk} ${account}`} />
      <p className="tabular-nums">
        {formatKm(stats.doneKm)} von {formatKm(stats.km)} erledigt
      </p>
      <p className="text-xs text-zinc-400 tabular-nums">
        {formatCount(stats.edgesDone)} von {formatCount(stats.edges)} Kanten
      </p>
    </>
  )
}

function EdgeDetails({
  dataset,
  id,
  strasse,
}: {
  dataset: Dataset
  id: number
  strasse: string | null
}) {
  const now = useNow()
  const edge = dataset.edges.find((item) => item.id === id)
  const done = dataset.doneById.get(id)
  return (
    <>
      <h2 className="pr-6 font-medium text-zinc-100">{strasse ?? 'Kante'}</h2>
      <p className="text-xs text-zinc-400">
        lfd_nr {id}
        {edge ? ` · ${formatKm(edge.km)}` : ''}
      </p>
      <p>
        {done
          ? `erledigt ${formatDayDistance(done.t, now)} (${formatDay(done.t)}) von ${done.by}`
          : 'offen'}
      </p>
    </>
  )
}
