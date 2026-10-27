import {
  streetImageryInteractiveLayerIds,
  VIEWPOINT_DIRECTION_LAYER_ID,
} from '@osm-editor-kit/street-imagery-react'
import { BaseMap } from '@shared/components/map/BaseMap'
import { MapillaryLayers, useMapillaryMapClick } from '@shared/components/mapillary/MapillaryLayers'
import { MapillaryToggle } from '@shared/components/mapillary/MapillaryToggle'
import { MAIN_MAP_ID } from '@shared/map/map-ids'
import { mapillaryProviders } from '@shared/mapillary/photo-style'
import { kvQueryOptions } from '@shared/kv/query-options'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'
import { RatingInfra3dLink, RatingPhotoViewer } from '@/components/RatingPhotoLinks'
import { Route } from '@/routes/index'
import { loadNodes } from '@/shared/datasets/dataset-idb'
import {
  interactiveNodeLayerIds,
  NODES_LABELS_LAYER_ID,
  NODES_LAYER_ID,
  NODES_SELECTED_LAYER_ID,
  NODES_SOURCE_ID,
} from '@/shared/map/map-ids'
import { nodeStatusColors } from '@/shared/map/node-style'
import { nodeLngLat, type JunctionNodeFeature } from '@/shared/nodes/schema'
import { defaultWorkNodeId, isDeferred, matchesStatusFilter } from '@/shared/ratings/queue'
import { ratingStore, ratingsQueryKey } from '@/shared/ratings/ratings-query'
import type { RatingRecord } from '@/shared/ratings/schema'
import { resolveStep } from '@/shared/routing/app-step'
import {
  resolvePhotoColor,
  resolvePhotosOn,
  resolveStatusFilter,
  resolveStreetsOn,
  searchMapParam,
  serializeIndexSearchMap,
} from '@/shared/routing/search-schema'

function nodePaintStatus(record: RatingRecord | undefined) {
  if (isDeferred(record)) return 'deferred'
  if (!record || record.status !== 'complete') return 'unrated'
  if (record.ist_virtuell === 1) return 'virtual'
  if (record.qa === 'corrected') return 'corrected'
  if (record.KP_Nichtbetrachten === 1) return 'skipped'
  return 'complete'
}

function nodeColor(record: RatingRecord | undefined) {
  const status = nodePaintStatus(record)
  if (status === 'deferred') return nodeStatusColors.deferred
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
  if (isDeferred(record)) return '#be185d'
  return '#b45309'
}

const photoLayerIds = [
  VIEWPOINT_DIRECTION_LAYER_ID,
  ...streetImageryInteractiveLayerIds(mapillaryProviders),
]

export function RatingMap() {
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const map = searchMapParam(search)
  const { dataset, node, bg } = search
  const currentStep = resolveStep(search)
  const statusFilter = resolveStatusFilter(search)
  const streetsOn = resolveStreetsOn(search)
  const photosOn = resolvePhotosOn(search) && currentStep === 'work'
  const photoColor = resolvePhotoColor(search)
  const handleMapillaryClick = useMapillaryMapClick()

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
  const records = ratingsQuery.data ?? {}
  const features = nodesQuery.data?.collection.features ?? []
  const overview = currentStep === 'overview' || currentStep === 'dataset'

  // Without a node in the URL the work panel rates the first open node; show that one.
  const workNodeId =
    currentStep === 'work'
      ? defaultWorkNodeId(
          features.map((feature) => feature.properties.id),
          records,
          node,
        )
      : node

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
            selected: feature.properties.id === workNodeId ? 1 : 0,
            color: nodeColor(record),
            stroke: nodeStroke(record),
            workDim: !overview && feature.properties.id !== workNodeId ? 1 : 0,
          },
        }
      }),
  }

  const selectedFeature = features.find((feature) => feature.properties.id === workNodeId)
  const flyTo = selectedFeature && currentStep === 'work' ? nodeLngLat(selectedFeature) : null
  const photoNode =
    selectedFeature && flyTo ? { id: selectedFeature.properties.id, lngLat: flyTo } : null

  return (
    <BaseMap
      view={map}
      bg={bg}
      onViewChange={(view) => {
        void navigate({
          search: (previous) => ({ ...previous, map: serializeIndexSearchMap(view) }),
          replace: true,
        })
      }}
      streetsOn={streetsOn}
      onStreetsChange={(on) => {
        void navigate({
          search: (previous) => ({ ...previous, streets: on ? undefined : false }),
          replace: true,
        })
      }}
      interactiveLayerIds={[...interactiveNodeLayerIds, ...(photosOn ? photoLayerIds : [])]}
      onClick={(event: MapLayerMouseEvent) => {
        const id = nodeIdFromEvent(event)
        if (!id) {
          if (photosOn) handleMapillaryClick(event)
          return
        }
        void navigate({
          search: (previous) => ({
            ...previous,
            node: id,
            step: 'work',
          }),
          replace: true,
        })
      }}
      overlay={photosOn && photoNode ? <RatingPhotoViewer node={photoNode} /> : null}
      controls={
        currentStep === 'work' ? (
          <>
            <MapillaryToggle
              photosOn={photosOn}
              onPhotosChange={(on) => {
                void navigate({
                  search: (previous) => ({ ...previous, photos: on ? undefined : false }),
                  replace: true,
                })
              }}
              zoom={map.zoom}
              viewportKey={search.map}
              photoColor={photoColor}
              onPhotoColorChange={(mode) => {
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    photoColor: mode === 'type' ? ('type' as const) : undefined,
                  }),
                  replace: true,
                })
              }}
            />
            {photoNode ? <RatingInfra3dLink node={photoNode} /> : null}
          </>
        ) : null
      }
    >
      {flyTo ? <FlyToSelected lng={flyTo[0]} lat={flyTo[1]} /> : null}
      {photosOn ? (
        <MapillaryLayers
          node={photoNode}
          zoom={map.zoom}
          viewportKey={search.map}
          streetsOn={streetsOn}
          photoColor={photoColor}
        />
      ) : null}
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
              5.5,
              6,
            ],
            'circle-opacity': ['case', ['==', ['get', 'workDim'], 1], 0.8, 1],
            'circle-stroke-opacity': ['case', ['==', ['get', 'workDim'], 1], 0.8, 1],
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
    </BaseMap>
  )
}

function nodeIdFromEvent(event: MapLayerMouseEvent) {
  const feature = event.features?.find((item) =>
    (interactiveNodeLayerIds as readonly string[]).includes(item.layer.id),
  ) as JunctionNodeFeature | undefined
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
