import { BaseMap } from '@shared/components/map/BaseMap'
import { serializeMapParam } from '@shared/map/map-param'
import type { ExpressionSpecification, FilterSpecification, MapLayerMouseEvent } from 'maplibre-gl'
import { useState } from 'react'
import { Layer, Source } from 'react-map-gl/maplibre'
import { accountColor, edgeColors } from '@/components/colors'
import { useMapSelection, useMapSelectionActions } from '@/components/map-selection-store'
import {
  EDGES_LAYER_ID,
  EDGES_SELECTED_LAYER_ID,
  EDGES_SOURCE_ID,
  GEBIETE_FILL_LAYER_ID,
  GEBIETE_LINE_LAYER_ID,
  GEBIETE_SELECTED_LAYER_ID,
  GEBIETE_SOURCE_ID,
} from '@/components/map/map-layers'
import { useDoneFeatureState } from '@/components/map/use-done-feature-state'
import { useUpdateSearch } from '@/components/use-fortschritt-nav'
import {
  edgesPmtilesUrl,
  gebietePmtilesUrl,
  pmtilesSourceLayer,
  tildaAttribution,
} from '@/config/app.const'
import { Route } from '@/routes/index'
import { searchMapParam } from '@/routing/search-schema'
import { mapLayerFilter, markdownLinkUrl } from '@/stats/map-filter'
import type { Dataset } from '@/stats/model'
import { bezirkName } from '@/stats/plan'

const interactiveLayerIds = [EDGES_LAYER_ID, GEBIETE_FILL_LAYER_ID]

type Filter = FilterSpecification

function accountColorExpression(accounts: string[]): ExpressionSpecification {
  return [
    'match',
    ['get', 'account'],
    ...accounts.flatMap((account) => [account, accountColor(accounts, account)]),
    '#898781',
  ] as unknown as ExpressionSpecification
}

export function FortschrittMap({ dataset }: { dataset: Dataset }) {
  const search = Route.useSearch()
  const updateSearch = useUpdateSearch()
  const selection = useMapSelection()
  const { select, clear } = useMapSelectionActions()
  const [cursor, setCursor] = useState('grab')
  const view = searchMapParam(search)
  const doneIds = [...dataset.doneById.keys()]
  useDoneFeatureState(doneIds)

  const filter = mapLayerFilter(dataset, search) as Filter
  const colorByAccount = accountColorExpression(dataset.accounts)
  const rawSelected =
    selection?.kind === 'gebiet' ? (dataset.rawBezirke.get(selection.bezirk) ?? []) : []
  const selectedGebietFilter = (
    selection?.kind === 'gebiet'
      ? [
          'all',
          ['in', ['get', 'bezirk'], ['literal', rawSelected]],
          ['==', ['get', 'account'], selection.account],
        ]
      : ['literal', false]
  ) as Filter
  const selectedEdgeFilter = (
    selection?.kind === 'kante' ? ['==', ['get', 'lfd_nr'], selection.id] : ['literal', false]
  ) as Filter

  function handleClick(event: MapLayerMouseEvent) {
    const features = event.features ?? []
    const edge = features.find((feature) => feature.layer.id === EDGES_LAYER_ID)
    const gebiet = features.find((feature) => feature.layer.id === GEBIETE_FILL_LAYER_ID)
    if (edge) {
      const props = edge.properties
      select({
        kind: 'kante',
        id: Number(props.lfd_nr),
        strasse: typeof props.strassenname === 'string' ? props.strassenname : null,
        bezirk: bezirkName(String(props.bezirk ?? '')),
        account: String(props.account ?? ''),
        editorUrl: markdownLinkUrl(props.editor_markdown),
      })
      return
    }
    if (gebiet) {
      const props = gebiet.properties
      select({
        kind: 'gebiet',
        bezirk: bezirkName(String(props.bezirk ?? '')),
        account: String(props.account ?? ''),
        editorUrl: markdownLinkUrl(props.editor_markdown),
      })
      return
    }
    clear()
  }

  return (
    <BaseMap
      view={view}
      bg={search.bg}
      onViewChange={(next) => updateSearch({ map: serializeMapParam(next) })}
      streetsOn={search.streets === true}
      onStreetsChange={(on) => updateSearch({ streets: on ? true : undefined })}
      interactiveLayerIds={interactiveLayerIds}
      cursor={cursor}
      onClick={handleClick}
      onMouseMove={(event) => setCursor(event.features?.length ? 'pointer' : 'grab')}
      onMouseOut={() => setCursor('grab')}
    >
      <Source
        id={GEBIETE_SOURCE_ID}
        type="vector"
        url={`pmtiles://${gebietePmtilesUrl}`}
        attribution={tildaAttribution}
      />
      <Source
        id={EDGES_SOURCE_ID}
        type="vector"
        url={`pmtiles://${edgesPmtilesUrl}`}
        promoteId="lfd_nr"
      />
      <Layer
        id={GEBIETE_FILL_LAYER_ID}
        type="fill"
        source={GEBIETE_SOURCE_ID}
        source-layer={pmtilesSourceLayer}
        filter={filter}
        paint={{ 'fill-color': colorByAccount, 'fill-opacity': 0.12 }}
      />
      <Layer
        id={GEBIETE_LINE_LAYER_ID}
        type="line"
        source={GEBIETE_SOURCE_ID}
        source-layer={pmtilesSourceLayer}
        filter={filter}
        paint={{ 'line-color': colorByAccount, 'line-width': 1.5, 'line-opacity': 0.9 }}
      />
      <Layer
        id={GEBIETE_SELECTED_LAYER_ID}
        type="line"
        source={GEBIETE_SOURCE_ID}
        source-layer={pmtilesSourceLayer}
        filter={selectedGebietFilter}
        paint={{ 'line-color': '#facc15', 'line-width': 3 }}
      />
      <Layer
        id={EDGES_SELECTED_LAYER_ID}
        type="line"
        source={EDGES_SOURCE_ID}
        source-layer={pmtilesSourceLayer}
        filter={selectedEdgeFilter}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{ 'line-color': '#facc15', 'line-width': 9 }}
      />
      <Layer
        id={EDGES_LAYER_ID}
        type="line"
        source={EDGES_SOURCE_ID}
        source-layer={pmtilesSourceLayer}
        filter={filter}
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'done'], false],
            edgeColors.done,
            edgeColors.open,
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 13, 2.5, 16, 5],
        }}
      />
    </BaseMap>
  )
}
