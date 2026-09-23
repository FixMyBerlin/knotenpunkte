import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { MapLayerMouseEvent, MapLibreEvent } from 'maplibre-gl'
import { useEffect } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@/shared/map/maplibre-worker'
import {
  AttributionControl,
  Layer,
  Map,
  Source,
  useMap,
  type ViewStateChangeEvent,
} from 'react-map-gl/maplibre'
import { MapBackgroundLayerControl } from '@/components/MapBackgroundLayerControl'
import { MapBackgroundLayerSource } from '@/components/MapBackgroundLayerSource'
import { MapResetNorthPitchButton } from '@/components/MapResetNorthPitchButton'
import { useMapUiActions, usePrivateRasterUrl } from '@/components/shared/map-ui-store'
import { StreetsLayer } from '@/components/StreetsLayer'
import { StreetsLegend } from '@/components/StreetsLegend'
import { Route } from '@/routes/index'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import { exposeMainMapForDebugging } from '@/shared/map/expose-main-map'
import {
  interactiveNodeLayerIds,
  MAIN_MAP_ID,
  NODES_LABELS_LAYER_ID,
  NODES_LAYER_ID,
  NODES_SELECTED_LAYER_ID,
  NODES_SOURCE_ID,
} from '@/shared/map/map-ids'
import { nodeStatusColors, OPENFREEMAP_POSITRON, privateRasterStyle } from '@/shared/map/node-style'
import { readPrivateRasterUrl, resolveBackgroundChoice } from '@/shared/map/private-raster'
import { usePmtilesProtocol } from '@/shared/map/use-pmtiles-protocol'
import { nodeLngLat, type JunctionNodeFeature } from '@/shared/nodes/schema'
import { matchesStatusFilter } from '@/shared/ratings/queue'
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'
import type { RatingRecord } from '@/shared/ratings/schema'
import { resolveStep } from '@/shared/routing/app-step'
import {
  resolveStatusFilter,
  resolveView,
  searchMapParam,
  serializeIndexSearchMap,
} from '@/shared/routing/search-schema'

function nodePaintStatus(record: RatingRecord | undefined) {
  if (!record || record.status !== 'complete') return 'unrated'
  if (record.ist_virtuell === 1) return 'virtual'
  if (record.qa === 'corrected') return 'corrected'
  if (record.KP_Nichtbetrachten === 1) return 'skipped'
  return 'complete'
}

function nodeColor(record: RatingRecord | undefined) {
  const status = nodePaintStatus(record)
  if (status === 'corrected') return nodeStatusColors.corrected
  if (status === 'virtual') return nodeStatusColors.virtual
  if (status === 'skipped') return nodeStatusColors.skipped
  if (status === 'complete') return nodeStatusColors.complete
  return nodeStatusColors.unrated
}

function nodeStroke(record: RatingRecord | undefined) {
  if (record?.qa === 'confirmed') return nodeStatusColors.confirmedStroke
  if (record?.qa === 'corrected') return '#0284c7'
  if (record?.ist_virtuell === 1) return '#7c3aed'
  if (record?.KP_Nichtbetrachten === 1) return '#111827'
  if (record?.status === 'complete') return '#15803d'
  return '#b45309'
}

export function RatingMap() {
  usePmtilesProtocol()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const map = searchMapParam(search)
  const { dataset, node, bg } = search
  const currentStep = resolveStep(search)
  const view = resolveView(search)
  const statusFilter = resolveStatusFilter(search)
  const { setHoveredNodeId, setMapBearing, setMapPitch, setPrivateRasterUrl } = useMapUiActions()
  const storedPrivateUrl = usePrivateRasterUrl()

  useEffect(
    function hydratePrivateRasterUrlFromStorage() {
      setPrivateRasterUrl(readPrivateRasterUrl())
    },
    [setPrivateRasterUrl],
  )

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
  const records = ratingsQuery.data ?? {}
  const features = nodesQuery.data?.collection.features ?? []
  const overview = view === 'overview' || currentStep === 'dataset'

  const geojson = {
    type: 'FeatureCollection' as const,
    features: features
      .filter((feature) => overview || matchesStatusFilter(records[feature.properties.id], 'all'))
      .filter((feature) =>
        overview ? matchesStatusFilter(records[feature.properties.id], statusFilter) : true,
      )
      .map((feature) => {
        const record = records[feature.properties.id]
        const [lng, lat] = nodeLngLat(feature)
        return {
          type: 'Feature' as const,
          id: feature.properties.id,
          geometry: { type: 'Point' as const, coordinates: [lng, lat] },
          properties: {
            id: feature.properties.id,
            selected: feature.properties.id === node ? 1 : 0,
            color: nodeColor(record),
            stroke: nodeStroke(record),
            workDim: !overview && feature.properties.id !== node ? 1 : 0,
          },
        }
      }),
  }

  const selectedFeature = features.find((feature) => feature.properties.id === node)
  const flyTo = selectedFeature && currentStep === 'work' ? nodeLngLat(selectedFeature) : null

  const background = resolveBackgroundChoice(bg, storedPrivateUrl)
  const mapStyle =
    background.kind === 'private' ? privateRasterStyle(background.url) : OPENFREEMAP_POSITRON
  const eliId = background.kind === 'eli' ? background.id : null

  return (
    <div className="relative h-full w-full">
      <Map
        id={MAIN_MAP_ID}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: map.lng,
          latitude: map.lat,
          zoom: map.zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactiveLayerIds={[...interactiveNodeLayerIds]}
        onLoad={(event: MapLibreEvent) => {
          exposeMainMapForDebugging(event.target)
          setMapBearing(event.target.getBearing())
          setMapPitch(event.target.getPitch())
        }}
        onRotate={(event: ViewStateChangeEvent) => {
          setMapBearing(event.viewState.bearing)
        }}
        onRotateEnd={(event: ViewStateChangeEvent) => {
          setMapBearing(event.viewState.bearing)
        }}
        onPitch={(event: ViewStateChangeEvent) => {
          setMapPitch(event.viewState.pitch)
        }}
        onPitchEnd={(event: ViewStateChangeEvent) => {
          setMapPitch(event.viewState.pitch)
        }}
        onMoveEnd={(event: ViewStateChangeEvent) => {
          const { latitude, longitude, zoom } = event.viewState
          void navigate({
            search: (previous) => ({
              ...previous,
              map: serializeIndexSearchMap({ zoom, lat: latitude, lng: longitude }),
            }),
            replace: true,
          })
        }}
        onMouseMove={(event: MapLayerMouseEvent) => {
          const id = nodeIdFromEvent(event)
          setHoveredNodeId(id)
        }}
        onMouseLeave={() => {
          setHoveredNodeId(null)
        }}
        onClick={(event: MapLayerMouseEvent) => {
          const id = nodeIdFromEvent(event)
          if (!id) return
          void navigate({
            search: (previous) => ({
              ...previous,
              node: id,
              view: 'work',
              step: 'work',
            }),
            replace: true,
          })
        }}
      >
        <AttributionControl compact position="bottom-right" />
        <MapBackgroundLayerSource backgroundLayerId={eliId} />
        <StreetsLayer />
        {flyTo ? <FlyToSelected lng={flyTo[0]} lat={flyTo[1]} /> : null}
        <Source id={NODES_SOURCE_ID} type="geojson" data={geojson}>
          <Layer
            id={NODES_LAYER_ID}
            type="circle"
            paint={{
              'circle-color': ['get', 'color'],
              'circle-stroke-color': ['get', 'stroke'],
              'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 1],
              'circle-radius': [
                'case',
                ['==', ['get', 'selected'], 1],
                8,
                ['==', ['get', 'workDim'], 1],
                4,
                6,
              ],
              'circle-opacity': ['case', ['==', ['get', 'workDim'], 1], 0.35, 1],
            }}
          />
          <Layer
            id={NODES_SELECTED_LAYER_ID}
            type="circle"
            filter={['==', ['get', 'selected'], 1]}
            paint={{
              'circle-color': 'transparent',
              'circle-stroke-color': '#fff',
              'circle-stroke-width': 2,
              'circle-radius': 11,
            }}
          />
          <Layer
            id={NODES_LABELS_LAYER_ID}
            type="symbol"
            minzoom={15}
            layout={{
              'text-field': ['get', 'id'],
              'text-size': 10,
              'text-font': ['Noto Sans Regular'],
              'text-offset': [0, 1.1],
              'text-anchor': 'top',
            }}
            paint={{
              'text-color': '#222',
              'text-halo-color': '#fff',
              'text-halo-width': 1,
              'text-opacity': ['step', ['zoom'], 0, 15, 1],
            }}
          />
        </Source>
      </Map>
      <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-2 *:pointer-events-auto">
        <MapResetNorthPitchButton />
        <MapBackgroundLayerControl bg={bg ?? null} lat={map.lat} lng={map.lng} />
      </div>
      <div className="pointer-events-none absolute bottom-8 left-3 z-10 *:pointer-events-auto">
        <StreetsLegend />
      </div>
    </div>
  )
}

function nodeIdFromEvent(event: MapLayerMouseEvent) {
  const feature = event.features?.[0] as JunctionNodeFeature | undefined
  const id = feature?.properties?.id
  return typeof id === 'string' ? id : null
}

function FlyToSelected({ lng, lat }: { lng: number; lat: number }) {
  const maps = useMap()
  const map = maps[MAIN_MAP_ID]
  useEffect(
    function flyToSelectedNode() {
      if (!map) return
      map.easeTo({ center: [lng, lat], duration: 400 })
    },
    [map, lng, lat],
  )
  return null
}
